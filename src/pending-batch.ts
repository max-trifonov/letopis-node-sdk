import { apiRequest } from './http.js'
import type { BatchResponse, ChangeOp, LetopisConfig, ReliabilityMode } from './types.js'

interface BatchEntry {
  collection: string
  entity_id: string
  type: 'state' | 'diff' | 'delete'
  payload: Record<string, unknown>
}

export class PendingBatch {
  private mode?: ReliabilityMode
  private events: BatchEntry[] = []

  constructor(private readonly config: LetopisConfig) {}

  strict():  this { this.mode = 'strict';  return this }
  durable(): this { this.mode = 'durable'; return this }
  fast():    this { this.mode = 'fast';    return this }

  /** Add a raw event entry (mirrors the /events:batch payload format). */
  add(collection: string, entityId: string, type: 'state' | 'diff' | 'delete', payload: Record<string, unknown>): this {
    this.events.push({ collection, entity_id: entityId, type, payload })
    return this
  }

  addState(collection: string, entityId: string, state: Record<string, unknown>, extra?: Record<string, unknown>): this {
    return this.add(collection, entityId, 'state', { ...extra, state })
  }

  addDiff(collection: string, entityId: string, changes: ChangeOp[], extra?: Record<string, unknown>): this {
    return this.add(collection, entityId, 'diff', { ...extra, changes })
  }

  addDelete(collection: string, entityId: string, meta?: Record<string, unknown>): this {
    return this.add(collection, entityId, 'delete', meta ?? {})
  }

  async send(): Promise<BatchResponse> {
    const raw = await apiRequest<{
      ticket_id: string
      accepted: number
      rejected?: Array<{ index: number; error: { code: string; message: string } }>
    }>(this.config, {
      method: 'POST',
      path: '/events:batch',
      body: { events: this.events },
      mode: this.mode,
    })

    return {
      ticketId: raw.ticket_id,
      accepted: raw.accepted,
      rejected: (raw.rejected ?? []).map(r => ({
        index:        r.index,
        errorCode:    r.error.code,
        errorMessage: r.error.message,
      })),
    }
  }
}
