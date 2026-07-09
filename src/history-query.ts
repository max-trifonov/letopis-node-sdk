import { apiRequest } from './http.js'
import { compact, mapFlowBlock, type WireFlowBlock } from './wire.js'
import type { EventRecord, HistoryResponse, LetopisConfig } from './types.js'

export class HistoryQuery {
  private params: Record<string, string | number | boolean | undefined> = {}

  constructor(
    private readonly config: LetopisConfig,
    private readonly collection: string,
    private readonly entityId: string,
  ) {}

  from(date: string):       this { this.params['from']      = date;      return this }
  to(date: string):         this { this.params['to']        = date;      return this }
  authorId(id: string):     this { this.params['author_id'] = id;        return this }
  op(op: string):           this { this.params['op']        = op;        return this }
  path(path: string):       this { this.params['path']      = path;      return this }
  source(source: string):   this { this.params['source']    = source;    return this }
  flowId(id: string):       this { this.params['flow_id']   = id;        return this }
  limit(n: number):         this { this.params['limit']     = n;         return this }
  cursor(cursor: string):   this { this.params['cursor']    = cursor;    return this }
  /** format: 'native' (default) | 'json-patch' */
  format(fmt: string):      this { this.params['format']    = fmt;       return this }

  /** field: 'version' | 'ts_source' | 'ts_received' */
  orderBy(field: string, direction: 'asc' | 'desc' = 'desc'): this {
    this.params['order_by'] = field
    this.params['order']    = direction
    return this
  }

  async get(): Promise<HistoryResponse> {
    const raw = await apiRequest<{
      entity_id: string
      events: Array<Record<string, unknown>>
      next_cursor?: string
    }>(this.config, {
      method: 'GET',
      path:   `/collections/${this.collection}/entities/${this.entityId}/history`,
      query:  this.params,
    })

    return compact<HistoryResponse>({
      entityId:   raw.entity_id,
      nextCursor: raw.next_cursor,
      events: raw.events.map(e => {
        const integrity = e['integrity'] as { hash: string; prev_hash: string } | undefined
        return compact<EventRecord>({
          version:    e['version']     as number,
          op:         e['op']          as string,
          authorId:   e['author_id']   as string | undefined,
          source:     e['source']      as string | undefined,
          tsSource:   e['ts_source']   as string | undefined,
          tsReceived: e['ts_received'] as string,
          tsStored:   e['ts_stored']   as string | undefined,
          changes:    (e['changes']    as Array<Record<string, unknown>>).map(c => ({
            path: c['path'] as string,
            op:   c['op']   as 'add' | 'change' | 'remove',
            old:  c['old'],
            new:  c['new'],
          })),
          meta:      e['meta'] as Record<string, unknown> | undefined,
          integrity: integrity && { hash: integrity.hash, prevHash: integrity.prev_hash },
          flow:      mapFlowBlock(e['flow'] as WireFlowBlock | undefined),
        })
      }),
    })
  }
}
