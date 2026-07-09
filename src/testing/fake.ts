import { LetopisClient } from '../client.js'
import { HistoryQuery } from '../history-query.js'
import { PendingActivity } from '../pending-activity.js'
import { PendingBatch } from '../pending-batch.js'
import { PendingIngest } from '../pending-ingest.js'
import type { LetopisConfig } from '../types.js'

interface RecordedCall {
  method: string
  collection?: string
  entityId?: string
  extra?: Record<string, unknown>
}

const FAKE_CONFIG: LetopisConfig = {
  baseUrl: 'http://letopis.fake',
  apiKey:  'test-key',
}

/**
 * A test double that records all calls without making HTTP requests.
 *
 * @example
 * const fake = new FakeLetopisClient()
 * // inject or use fake directly in your service under test
 * fake.assertIngestedState('crm.deals', 'd-1')
 * fake.assertActivityCreated('recalc.prices')
 */
export class FakeLetopisClient extends LetopisClient {
  private calls: RecordedCall[] = []

  constructor() {
    super(FAKE_CONFIG)
  }

  // -------------------------------------------------------------------------
  // Overrides — record calls, return stub responses
  // -------------------------------------------------------------------------

  override ingest(collection: string, entityId: string): PendingIngest {
    return new FakePendingIngest(this, collection, entityId)
  }

  override batch(): PendingBatch {
    return new FakePendingBatch(this)
  }

  override activity(): PendingActivity {
    return new FakePendingActivity(this)
  }

  override history(collection: string, entityId: string): HistoryQuery {
    this.record({ method: 'history', collection, entityId })
    return new FakeHistoryQuery()
  }

  override async state(collection: string, entityId: string) {
    this.record({ method: 'state', collection, entityId })
    return { entityId, version: 1, ts: new Date().toISOString(), deleted: false, state: {} }
  }

  override async ticket(ticketId: string) {
    this.record({ method: 'ticket', extra: { ticketId } })
    return { ticketId, status: 'stored' }
  }

  override async collections() {
    this.record({ method: 'collections' })
    return { collections: [] }
  }

  // -------------------------------------------------------------------------
  // Internal call recording (called by Fake* sub-classes)
  // -------------------------------------------------------------------------

  record(call: RecordedCall): void {
    this.calls.push(call)
  }

  // -------------------------------------------------------------------------
  // Assertions
  // -------------------------------------------------------------------------

  assertIngestedState(collection: string, entityId: string): void {
    this.assertCall('ingest:state', collection, entityId)
  }

  assertIngestedDiff(collection: string, entityId: string): void {
    this.assertCall('ingest:diff', collection, entityId)
  }

  assertDeleted(collection: string, entityId: string): void {
    this.assertCall('ingest:delete', collection, entityId)
  }

  assertBatchSent(): void {
    if (!this.calls.some(c => c.method === 'batch:send')) {
      throw new Error('Expected a batch to be sent, but none was recorded.')
    }
  }

  assertActivityCreated(type?: string): void {
    const found = this.calls.some(c =>
      c.method === 'activity:create' &&
      (type === undefined || c.extra?.['type'] === type),
    )
    if (!found) {
      throw new Error(
        type ? `Expected activity of type "${type}" to be created.`
              : 'Expected an activity to be created.',
      )
    }
  }

  assertNothingSent(): void {
    if (this.calls.length > 0) {
      throw new Error(`Expected no Letopis calls, but ${this.calls.length} were recorded.`)
    }
  }

  /** Access all recorded calls for custom assertions. */
  recordedCalls(): RecordedCall[] {
    return [...this.calls]
  }

  private assertCall(method: string, collection: string, entityId: string): void {
    const found = this.calls.some(
      c => c.method === method && c.collection === collection && c.entityId === entityId,
    )
    if (!found) {
      throw new Error(`Expected ${method} for ${collection}/${entityId}, but none was recorded.`)
    }
  }
}

// ---------------------------------------------------------------------------
// Fake sub-classes — record calls and return stub responses
// ---------------------------------------------------------------------------

class FakePendingIngest extends PendingIngest {
  constructor(
    private readonly fake: FakeLetopisClient,
    private readonly col: string,
    private readonly eid: string,
  ) {
    super(FAKE_CONFIG, col, eid)
  }

  override async state(state: Record<string, unknown>) {
    this.fake.record({ method: 'ingest:state', collection: this.col, entityId: this.eid, extra: { state } })
    return { status: 'accepted' as const, ticketId: 'tkt_fake' }
  }

  override async diff(changes: unknown[]) {
    this.fake.record({ method: 'ingest:diff', collection: this.col, entityId: this.eid, extra: { changes } })
    return { status: 'accepted' as const, ticketId: 'tkt_fake' }
  }

  override async delete() {
    this.fake.record({ method: 'ingest:delete', collection: this.col, entityId: this.eid })
    return { status: 'accepted' as const, ticketId: 'tkt_fake' }
  }
}

class FakePendingBatch extends PendingBatch {
  constructor(private readonly fake: FakeLetopisClient) {
    super(FAKE_CONFIG)
  }

  override async send() {
    this.fake.record({ method: 'batch:send' })
    return { ticketId: 'tkt_fake', accepted: 0, rejected: [] }
  }
}

class FakePendingActivity extends PendingActivity {
  private activityType?: string

  constructor(private readonly fake: FakeLetopisClient) {
    super(FAKE_CONFIG)
  }

  override type(t: string): this {
    this.activityType = t
    return super.type(t)
  }

  override async create() {
    this.fake.record({ method: 'activity:create', extra: { type: this.activityType } })
    return { status: 'accepted' as const, activityId: 'act_fake', flowId: 'f_fake', ticketId: 'tkt_fake' }
  }
}

class FakeHistoryQuery extends HistoryQuery {
  constructor() {
    super(FAKE_CONFIG, 'fake', 'fake')
  }

  override async get() {
    return { entityId: 'fake', events: [] }
  }
}
