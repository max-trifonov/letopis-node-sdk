import { apiRequest } from './http.js'
import { compact } from './wire.js'
import type { ActivityResponse, FlowRef, LetopisConfig, ReliabilityMode } from './types.js'

export class PendingActivity {
  private mode?: ReliabilityMode
  private payload: Record<string, unknown> = {}

  constructor(private readonly config: LetopisConfig) {
    if (config.source) this.payload['source'] = config.source
  }

  strict():  this { this.mode = 'strict';  return this }
  durable(): this { this.mode = 'durable'; return this }
  fast():    this { this.mode = 'fast';    return this }

  type(type: string):              this { this.payload['type']        = type;        return this }
  activityId(id: string):         this { this.payload['activity_id'] = id;          return this }
  flowId(id: string):             this { this.payload['flow_id']     = id;          return this }
  authorId(id: string):           this { this.payload['author_id']   = id;          return this }
  source(source: string):         this { this.payload['source']      = source;      return this }
  tsSource(ts: string):           this { this.payload['ts_source']   = ts;          return this }
  causedBy(refs: FlowRef[]):      this { this.payload['caused_by']   = refs;        return this }
  refs(refs: FlowRef[]):          this { this.payload['refs']        = refs;        return this }
  data(data: Record<string, unknown>): this { this.payload['data']   = data;        return this }
  meta(meta: Record<string, unknown>): this { this.payload['meta']   = meta;        return this }

  async create(): Promise<ActivityResponse> {
    const raw = await apiRequest<{
      ticket_id?: string
      activity_id: string
      flow_id: string
    }>(this.config, {
      method: 'POST',
      path:   '/activities',
      body:   this.payload,
      mode:   this.mode,
    })

    return compact<ActivityResponse>({
      status:     raw.ticket_id ? 'accepted' : 'created',
      activityId: raw.activity_id,
      flowId:     raw.flow_id,
      ticketId:   raw.ticket_id,
    })
  }
}
