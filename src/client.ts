import { apiRequest } from './http.js'
import { compact, mapFlowRefs, type WireFlowRef } from './wire.js'
import { HistoryQuery } from './history-query.js'
import { PendingActivity } from './pending-activity.js'
import { PendingBatch } from './pending-batch.js'
import { PendingIngest } from './pending-ingest.js'
import { AdminResource } from './resources/admin.js'
import { CollectionConfigResource } from './resources/collection-config.js'
import { RuleResource } from './resources/rules.js'
import type {
  CollectionsResponse,
  FlowNode,
  FlowResponse,
  LetopisConfig,
  StateResponse,
  TicketStatus,
  VerifyResponse,
} from './types.js'

export class LetopisClient {
  constructor(protected readonly config: LetopisConfig) {}

  // -------------------------------------------------------------------------
  // Ingest
  // -------------------------------------------------------------------------

  ingest(collection: string, entityId: string): PendingIngest {
    return new PendingIngest(this.config, collection, entityId)
  }

  batch(): PendingBatch {
    return new PendingBatch(this.config)
  }

  // -------------------------------------------------------------------------
  // History / state
  // -------------------------------------------------------------------------

  history(collection: string, entityId: string): HistoryQuery {
    return new HistoryQuery(this.config, collection, entityId)
  }

  async state(collection: string, entityId: string): Promise<StateResponse> {
    return this.fetchState(collection, entityId, {})
  }

  async stateAtVersion(collection: string, entityId: string, version: number): Promise<StateResponse> {
    return this.fetchState(collection, entityId, { version })
  }

  async stateAt(collection: string, entityId: string, at: string): Promise<StateResponse> {
    return this.fetchState(collection, entityId, { at })
  }

  private async fetchState(
    collection: string,
    entityId: string,
    query: Record<string, string | number | undefined>,
  ): Promise<StateResponse> {
    const raw = await apiRequest<Record<string, unknown>>(this.config, {
      method: 'GET',
      path:   `/collections/${collection}/entities/${entityId}/state`,
      query,
    })

    const rf = raw['reconstructed_from'] as Record<string, unknown> | undefined
    return {
      entityId:  raw['entity_id']  as string,
      version:   raw['version']    as number,
      ts:        raw['ts']         as string,
      deleted:   raw['deleted']    as boolean,
      state:     raw['state']      as Record<string, unknown> | null,
      ...(rf && {
        reconstructedFrom: {
          snapshotVersion: rf['snapshot_version'] as number | null,
          eventsApplied:   rf['events_applied']   as number,
        },
      }),
    }
  }

  // -------------------------------------------------------------------------
  // Tickets
  // -------------------------------------------------------------------------

  async ticket(ticketId: string): Promise<TicketStatus> {
    const raw = await apiRequest<Record<string, unknown>>(this.config, {
      method: 'GET',
      path:   `/tickets/${ticketId}`,
    })

    return compact<TicketStatus>({
      ticketId:         raw['ticket_id']          as string,
      status:           raw['status']              as string,
      entityCollection: raw['entity_collection']   as string | undefined,
      entityId:         raw['entity_id']           as string | undefined,
      error:            raw['error']               as string | undefined,
      createdAt:        raw['created_at']          as string | undefined,
      updatedAt:        raw['updated_at']          as string | undefined,
    })
  }

  // -------------------------------------------------------------------------
  // Collections
  // -------------------------------------------------------------------------

  async collections(): Promise<CollectionsResponse> {
    const raw = await apiRequest<{ collections: Array<Record<string, unknown>> }>(this.config, {
      method: 'GET',
      path:   '/collections',
    })

    return {
      collections: raw.collections.map(c => ({
        name:        c['name']          as string,
        entities:    c['entities']      as number,
        events:      c['events']        as number,
        lastEventAt: c['last_event_at'] as string | null,
        config:      c['config']        as Record<string, unknown>,
      })),
    }
  }

  // -------------------------------------------------------------------------
  // Activities & flows
  // -------------------------------------------------------------------------

  activity(): PendingActivity {
    return new PendingActivity(this.config)
  }

  async flow(flowId: string, cursor?: string): Promise<FlowResponse> {
    const raw = await apiRequest<Record<string, unknown>>(this.config, {
      method: 'GET',
      path:   `/flows/${flowId}`,
      query:  cursor ? { cursor } : undefined,
    })

    return compact<FlowResponse>({
      flowId:     raw['flow_id']     as string,
      nextCursor: raw['next_cursor'] as string | undefined,
      nodes:      (raw['nodes'] as Array<Record<string, unknown>>).map(n => compact<FlowNode>({
        kind:       n['kind']        as 'event' | 'activity',
        tsReceived: n['ts_received'] as string,
        causedBy:   mapFlowRefs(n['caused_by'] as WireFlowRef[] | undefined) ?? [],
        collection: n['collection']  as string | undefined,
        entityId:   n['entity_id']   as string | undefined,
        version:    n['version']     as number | undefined,
        op:         n['op']          as string | undefined,
        step:       n['step']        as string | undefined,
        activityId: n['activity_id'] as string | undefined,
        type:       n['type']        as string | undefined,
        refs:       mapFlowRefs(n['refs'] as WireFlowRef[] | undefined),
        data:       n['data']        as Record<string, unknown> | undefined,
      })),
    })
  }

  async entityFlows(collection: string, entityId: string): Promise<unknown[]> {
    const raw = await apiRequest<{ flows: unknown[] }>(this.config, {
      method: 'GET',
      path:   `/collections/${collection}/entities/${entityId}/flows`,
    })
    return raw.flows
  }

  // -------------------------------------------------------------------------
  // Rules / config / admin
  // -------------------------------------------------------------------------

  rules(collection: string): RuleResource {
    return new RuleResource(this.config, collection)
  }

  collectionConfig(collection: string): CollectionConfigResource {
    return new CollectionConfigResource(this.config, collection)
  }

  admin(): AdminResource {
    return new AdminResource(this.config)
  }

  // -------------------------------------------------------------------------
  // Hash-chain integrity
  // -------------------------------------------------------------------------

  async verify(collection: string, entityId: string): Promise<VerifyResponse> {
    return this.parseVerify(await apiRequest(this.config, {
      method: 'POST',
      path:   `/collections/${collection}/entities/${entityId}:verify`,
    }))
  }

  async verifyCollection(collection: string): Promise<VerifyResponse> {
    return this.parseVerify(await apiRequest(this.config, {
      method: 'POST',
      path:   `/collections/${collection}:verify`,
    }))
  }

  private parseVerify(raw: Record<string, unknown>): VerifyResponse {
    return compact<VerifyResponse>({
      valid:            raw['valid']             as boolean,
      brokenAtVersion:  raw['broken_at_version'] as number | undefined,
      purged:           raw['purged']            as boolean | undefined,
      auditRef:         raw['audit_ref']         as string | undefined,
      ticketId:         raw['ticket_id']         as string | undefined,
    })
  }

  // -------------------------------------------------------------------------
  // Health / meta
  // -------------------------------------------------------------------------

  async healthz(): Promise<Record<string, unknown>> {
    return apiRequest({ ...this.config, retries: 0 }, { method: 'GET', path: '/../healthz' })
  }

  async readyz(): Promise<Record<string, unknown>> {
    return apiRequest({ ...this.config, retries: 0 }, { method: 'GET', path: '/../readyz' })
  }

  async version(): Promise<Record<string, unknown>> {
    return apiRequest(this.config, { method: 'GET', path: '/version' })
  }
}
