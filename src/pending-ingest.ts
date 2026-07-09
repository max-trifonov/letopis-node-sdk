import { apiRequest } from './http.js'
import { compact } from './wire.js'
import type { LetopisConfig, ChangeOp, FlowBlock, IngestResponse, ReliabilityMode } from './types.js'

export class PendingIngest {
  private mode?: ReliabilityMode
  private payload: Record<string, unknown> = {}

  constructor(
    private readonly config: LetopisConfig,
    private readonly collection: string,
    private readonly entityId: string,
  ) {
    if (config.source) this.payload['source'] = config.source
  }

  // -------------------------------------------------------------------------
  // Reliability mode
  // -------------------------------------------------------------------------

  strict():  this { this.mode = 'strict';  return this }
  durable(): this { this.mode = 'durable'; return this }
  fast():    this { this.mode = 'fast';    return this }

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  authorId(id: string):       this { this.payload['author_id']   = id;      return this }
  source(source: string):     this { this.payload['source']      = source;  return this }
  tsSource(ts: string):       this { this.payload['ts_source']   = ts;      return this }
  meta(m: Record<string, unknown>): this { this.payload['meta']  = m;       return this }
  eventId(id: string):        this { this.payload['event_id']    = id;      return this }
  idempotencyKey(key: string): this { return this.eventId(key) }
  expectedVersion(v: number): this { this.payload['expected_version'] = v;  return this }
  op(op: 'create' | 'update' | 'delete'): this { this.payload['op'] = op;  return this }

  flow(block: FlowBlock): this {
    this.payload['flow'] = {
      ...(block.flowId    && { flow_id:    block.flowId }),
      ...(block.causedBy  && { caused_by:  block.causedBy }),
      ...(block.step      && { step:       block.step }),
    }
    return this
  }

  // -------------------------------------------------------------------------
  // Terminal methods
  // -------------------------------------------------------------------------

  /** Ingest full entity state; the server computes the diff. */
  async state(state: Record<string, unknown>): Promise<IngestResponse> {
    return this.send('state', { ...this.payload, state })
  }

  /** Ingest a pre-computed diff. */
  async diff(changes: ChangeOp[]): Promise<IngestResponse> {
    return this.send('diff', { ...this.payload, changes })
  }

  /** Record a delete event. */
  async delete(): Promise<IngestResponse> {
    return this.send('delete', this.payload)
  }

  private async send(type: string, body: unknown): Promise<IngestResponse> {
    const raw = await apiRequest<Record<string, unknown>>(this.config, {
      method: 'POST',
      path:   `/collections/${this.collection}/entities/${this.entityId}/${type}`,
      body,
      mode:   this.mode,
    })
    return parseIngestResponse(raw)
  }
}

function parseIngestResponse(raw: Record<string, unknown>): IngestResponse {
  if ('ticket_id' in raw && !('version' in raw)) {
    return { status: 'accepted', ticketId: raw['ticket_id'] as string }
  }
  if ('version' in raw) {
    return compact<IngestResponse>({
      status: 'created',
      entityId:     raw['entity_id'] as string | undefined,
      version:      raw['version']   as number,
      changesCount: raw['changes_count'] as number | undefined,
    })
  }
  return { status: 'no_changes' }
}
