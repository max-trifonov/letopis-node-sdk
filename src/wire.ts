// Helpers for mapping the server's snake_case wire DTOs into the SDK's
// camelCase response types. Internal — not exported from the package index.

import type { FlowBlock, FlowRef } from './types.js'

type MaybeUndefined<T> = { [K in keyof T]: T[K] | undefined }

/**
 * Build a DTO with optional keys truly absent rather than set to undefined.
 * Wire fields that may be missing are cast to `X | undefined`; spreading
 * them straight into a response object would violate exactOptionalPropertyTypes
 * and leave explicit `undefined` values behind.
 */
export function compact<T extends object>(fields: MaybeUndefined<T>): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) out[key] = value
  }
  return out as T
}

export interface WireFlowRef {
  activity_id?: string
  collection?: string
  entity_id?: string
  version?: number
  event_id?: string
}

export interface WireFlowBlock {
  flow_id?: string
  caused_by?: WireFlowRef[]
  step?: string
}

export function mapFlowRef(raw: WireFlowRef): FlowRef {
  return compact<FlowRef>({
    activityId: raw.activity_id,
    collection: raw.collection,
    entityId:   raw.entity_id,
    version:    raw.version,
    eventId:    raw.event_id,
  })
}

export function mapFlowRefs(raw: WireFlowRef[] | undefined): FlowRef[] | undefined {
  return raw?.map(mapFlowRef)
}

export function mapFlowBlock(raw: WireFlowBlock | undefined): FlowBlock | undefined {
  if (!raw) return undefined
  return compact<FlowBlock>({
    flowId:   raw.flow_id,
    causedBy: mapFlowRefs(raw.caused_by),
    step:     raw.step,
  })
}
