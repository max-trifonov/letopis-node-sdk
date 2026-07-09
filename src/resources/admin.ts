import { apiRequest } from '../http.js'
import type { LetopisConfig } from '../types.js'

export class AdminResource {
  constructor(private readonly config: LetopisConfig) {}

  // -------------------------------------------------------------------------
  // Tenants
  // -------------------------------------------------------------------------

  async listTenants(): Promise<unknown[]> {
    const raw = await apiRequest<{ tenants: unknown[] }>(this.config, { method: 'GET', path: '/admin/tenants' })
    return raw.tenants
  }

  async createTenant(tenant: Record<string, unknown>): Promise<Record<string, unknown>> {
    return apiRequest(this.config, { method: 'POST', path: '/admin/tenants', body: tenant })
  }

  async deleteTenant(tenantId: string): Promise<void> {
    return apiRequest(this.config, { method: 'DELETE', path: `/admin/tenants/${tenantId}` })
  }

  // -------------------------------------------------------------------------
  // API keys
  // -------------------------------------------------------------------------

  async listKeys(): Promise<unknown[]> {
    const raw = await apiRequest<{ keys: unknown[] }>(this.config, { method: 'GET', path: '/admin/keys' })
    return raw.keys
  }

  async createKey(params: Record<string, unknown>): Promise<{ key: string; id: string }> {
    return apiRequest(this.config, { method: 'POST', path: '/admin/keys', body: params })
  }

  async deleteKey(keyId: string): Promise<void> {
    return apiRequest(this.config, { method: 'DELETE', path: `/admin/keys/${keyId}` })
  }

  // -------------------------------------------------------------------------
  // Purge (right to be forgotten)
  // -------------------------------------------------------------------------

  async purgeEntity(collection: string, entityId: string): Promise<Record<string, unknown>> {
    return apiRequest(this.config, {
      method: 'POST',
      path:   `/collections/${collection}/entities/${entityId}:purge`,
      body:   { confirm: entityId },
    })
  }

  async purgeCollection(collection: string): Promise<Record<string, unknown>> {
    return apiRequest(this.config, {
      method: 'POST',
      path:   `/collections/${collection}:purge`,
      body:   { confirm: collection },
    })
  }
}
