import { compact, mapFlowBlock, mapFlowRef } from '../src/wire.js'

describe('compact', () => {
  test('drops keys whose value is undefined', () => {
    const out = compact<{ a: number; b?: string }>({ a: 1, b: undefined })
    expect(out).toEqual({ a: 1 })
    expect('b' in out).toBe(false)
  })

  test('keeps null and falsy values — only undefined means absent', () => {
    expect(compact<{ a: null; b: number; c: boolean }>({ a: null, b: 0, c: false }))
      .toEqual({ a: null, b: 0, c: false })
  })
})

describe('flow mapping', () => {
  test('maps a snake_case wire FlowRef to camelCase', () => {
    expect(mapFlowRef({ activity_id: 'act_1', collection: 'crm.deals', entity_id: 'd-1', version: 3, event_id: 'ev_9' }))
      .toEqual({ activityId: 'act_1', collection: 'crm.deals', entityId: 'd-1', version: 3, eventId: 'ev_9' })
  })

  test('omits absent FlowRef fields instead of carrying undefined', () => {
    const ref = mapFlowRef({ activity_id: 'act_1' })
    expect(ref).toEqual({ activityId: 'act_1' })
    expect('entityId' in ref).toBe(false)
  })

  test('maps a full wire FlowBlock including nested caused_by refs', () => {
    expect(mapFlowBlock({
      flow_id: 'f_1',
      step: 'recalc',
      caused_by: [{ collection: 'crm.deals', entity_id: 'd-1', version: 2 }],
    })).toEqual({
      flowId: 'f_1',
      step: 'recalc',
      causedBy: [{ collection: 'crm.deals', entityId: 'd-1', version: 2 }],
    })
  })

  test('returns undefined for an absent flow block', () => {
    expect(mapFlowBlock(undefined)).toBeUndefined()
  })
})
