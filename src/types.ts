// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type ReliabilityMode = 'strict' | 'durable' | 'fast'

export interface LetopisConfig {
  /** Base URL of the Letopis instance, e.g. https://letopis.example.com */
  baseUrl: string
  /** API key (Bearer token). Tenant is derived server-side. */
  apiKey: string
  /**
   * Identifies which application is writing the history.
   * Included automatically in every ingest/activity request.
   * Override per-request with .source('...').
   */
  source?: string
  /**
   * Default reliability mode. null = use the server's collection default.
   * Override per-request with .strict() / .durable() / .fast().
   */
  defaultMode?: ReliabilityMode
  /** Request timeout in milliseconds. Default: 30 000. */
  timeout?: number
  /** How many times to retry on network errors. Default: 3. */
  retries?: number
}

// ---------------------------------------------------------------------------
// Diff / change
// ---------------------------------------------------------------------------

export type ChangeOpType = 'add' | 'change' | 'remove'

export interface ChangeOp {
  path: string
  op: ChangeOpType
  old?: unknown
  new?: unknown
}

/** Helpers to build ChangeOp objects. */
export const change = {
  add:    (path: string, value: unknown): ChangeOp  => ({ path, op: 'add', new: value }),
  change: (path: string, from: unknown, to: unknown): ChangeOp => ({ path, op: 'change', old: from, new: to }),
  remove: (path: string, value: unknown): ChangeOp  => ({ path, op: 'remove', old: value }),
}

// ---------------------------------------------------------------------------
// Flow block (attached to any ingest event)
// ---------------------------------------------------------------------------

export interface FlowRef {
  activityId?: string
  collection?: string
  entityId?: string
  version?: number
  eventId?: string
}

export interface FlowBlock {
  flowId?: string
  causedBy?: FlowRef[]
  step?: string
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export type IngestStatus = 'accepted' | 'created' | 'no_changes'

export interface IngestResponse {
  status: IngestStatus
  /** Present when status = 'accepted' (202) */
  ticketId?: string
  /** Present when status = 'created' (201, strict mode) */
  entityId?: string
  version?: number
  changesCount?: number
}

export interface TicketStatus {
  ticketId: string
  /** accepted | processing | stored | failed | partial */
  status: string
  entityCollection?: string
  entityId?: string
  error?: string
  createdAt?: string
  updatedAt?: string
}

export interface IntegrityInfo {
  hash: string
  prevHash: string
}

export interface EventRecord {
  version: number
  op: string
  authorId?: string
  source?: string
  tsSource?: string
  tsReceived: string
  tsStored?: string
  changes: ChangeOp[]
  meta?: Record<string, unknown>
  integrity?: IntegrityInfo
  flow?: FlowBlock
}

export interface HistoryResponse {
  entityId: string
  events: EventRecord[]
  nextCursor?: string
}

export interface ReconstructedFrom {
  snapshotVersion: number | null
  eventsApplied: number
}

export interface StateResponse {
  entityId: string
  version: number
  ts: string
  deleted: boolean
  state: Record<string, unknown> | null
  reconstructedFrom?: ReconstructedFrom
}

export interface BatchReject {
  index: number
  errorCode: string
  errorMessage: string
}

export interface BatchResponse {
  ticketId: string
  accepted: number
  rejected: BatchReject[]
}

export interface CollectionInfo {
  name: string
  entities: number
  events: number
  lastEventAt: string | null
  config: Record<string, unknown>
}

export interface CollectionsResponse {
  collections: CollectionInfo[]
}

export interface FlowNode {
  kind: 'event' | 'activity'
  tsReceived: string
  causedBy: FlowRef[]
  // event-only
  collection?: string
  entityId?: string
  version?: number
  op?: string
  step?: string
  // activity-only
  activityId?: string
  type?: string
  refs?: FlowRef[]
  data?: Record<string, unknown>
}

export interface FlowResponse {
  flowId: string
  nodes: FlowNode[]
  nextCursor?: string
}

export type ActivityStatus = 'accepted' | 'created'

export interface ActivityResponse {
  status: ActivityStatus
  activityId: string
  flowId: string
  ticketId?: string
}

export interface VerifyResponse {
  valid: boolean
  brokenAtVersion?: number
  purged?: boolean
  auditRef?: string
  /** Present when the verify was submitted async (collection-wide) */
  ticketId?: string
}
