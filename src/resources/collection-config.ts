import { apiRequest } from '../http.js'
import type { LetopisConfig } from '../types.js'

export class CollectionConfigResource {
  constructor(
    private readonly config: LetopisConfig,
    private readonly collection: string,
  ) {}

  async get(): Promise<Record<string, unknown>> {
    return apiRequest(this.config, {
      method: 'GET',
      path:   `/collections/${this.collection}/config`,
    })
  }

  async put(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiRequest(this.config, {
      method: 'PUT',
      path:   `/collections/${this.collection}/config`,
      body:   config,
    })
  }
}
