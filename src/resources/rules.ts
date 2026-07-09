import { apiRequest } from '../http.js'
import type { LetopisConfig } from '../types.js'

export class RuleResource {
  constructor(
    private readonly config: LetopisConfig,
    private readonly collection: string,
  ) {}

  private base() { return `/collections/${this.collection}/rules` }

  async list(): Promise<unknown[]> {
    const raw = await apiRequest<{ rules: unknown[] }>(this.config, { method: 'GET', path: this.base() })
    return raw.rules
  }

  async create(rule: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiRequest(this.config, { method: 'POST', path: this.base(), body: rule })
  }

  async get(ruleId: string): Promise<Record<string, unknown>> {
    return apiRequest(this.config, { method: 'GET', path: `${this.base()}/${ruleId}` })
  }

  async update(ruleId: string, rule: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiRequest(this.config, { method: 'PUT', path: `${this.base()}/${ruleId}`, body: rule })
  }

  async delete(ruleId: string): Promise<void> {
    return apiRequest(this.config, { method: 'DELETE', path: `${this.base()}/${ruleId}` })
  }

  // -------------------------------------------------------------------------
  // DLQ
  // -------------------------------------------------------------------------

  async dlq(ruleId: string, cursor?: string): Promise<{ items: unknown[]; nextCursor?: string }> {
    const raw = await apiRequest<{ items: unknown[]; next_cursor?: string }>(this.config, {
      method: 'GET',
      path:   `${this.base()}/${ruleId}/dlq`,
      query:  cursor ? { cursor } : undefined,
    })
    return {
      items: raw.items,
      ...(raw.next_cursor !== undefined && { nextCursor: raw.next_cursor }),
    }
  }

  /** Pass ids to redeliver specific items, or omit to redeliver all. */
  async redeliver(ruleId: string, ids?: string[]): Promise<number> {
    const raw = await apiRequest<{ requeued: number }>(this.config, {
      method: 'POST',
      path:   `${this.base()}/${ruleId}/dlq:redeliver`,
      body:   ids ? { ids } : {},
    })
    return raw.requeued
  }
}
