// Main client
export { LetopisClient } from './client.js'

// Fluent builders (for typing in user code)
export { PendingIngest } from './pending-ingest.js'
export { PendingBatch } from './pending-batch.js'
export { PendingActivity } from './pending-activity.js'
export { HistoryQuery } from './history-query.js'

// Resources
export { RuleResource } from './resources/rules.js'
export { CollectionConfigResource } from './resources/collection-config.js'
export { AdminResource } from './resources/admin.js'

// Webhooks
export { verifyWebhookSignature, computeSignature } from './webhooks.js'

// Types
export type {
  LetopisConfig,
  ReliabilityMode,
  ChangeOp,
  ChangeOpType,
  FlowBlock,
  FlowRef,
  IngestResponse,
  IngestStatus,
  TicketStatus,
  EventRecord,
  HistoryResponse,
  StateResponse,
  ReconstructedFrom,
  BatchResponse,
  BatchReject,
  CollectionsResponse,
  CollectionInfo,
  FlowResponse,
  FlowNode,
  ActivityResponse,
  ActivityStatus,
  VerifyResponse,
} from './types.js'

// Change helpers
export { change } from './types.js'

// Errors
export {
  LetopisError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  PluginRejectionError,
  RateLimitError,
  ServerError,
} from './errors.js'
