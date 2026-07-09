# letopis-node

[![CI](https://github.com/max-trifonov/letopis-node-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/max-trifonov/letopis-node-sdk/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/letopis-node.svg)](https://www.npmjs.com/package/letopis-node)

Node.js / TypeScript SDK for [Letopis](https://letopis.tech) — a multi-tenant entity history service.
Track every change to your CRM deals, documents, orders, or any other entities.

## Requirements

- Node.js 18+ (native `fetch`)
- TypeScript 5+ (optional, works with plain JS too)

## Installation

```bash
npm install letopis-node
# or
yarn add letopis-node
```

## Quick start

```typescript
import { LetopisClient, change } from 'letopis-node'

const letopis = new LetopisClient({
  baseUrl: 'https://your-letopis-instance.example.com',
  apiKey:  'hm_live_...',
  source:  'my-app',           // included in every event automatically
})

// Record a state change
await letopis.ingest('crm.deals', 'd-1')
  .authorId('42')
  .state({ title: 'Deal #1', amount: 250, status: 'open' })

// Read history
const history = await letopis.history('crm.deals', 'd-1').limit(50).get()
```

## Configuration

```typescript
interface LetopisConfig {
  /** Base URL of the Letopis instance */
  baseUrl: string

  /** API key (Bearer token). Tenant is derived server-side. */
  apiKey: string

  /**
   * Source identifier included automatically in every request.
   * Override per-request with .source('...').
   */
  source?: string

  /**
   * Default reliability mode. Overrides the server collection default.
   * Override per-request with .strict() / .durable() / .fast().
   */
  defaultMode?: 'strict' | 'durable' | 'fast'

  /** Request timeout in ms. Default: 30 000. */
  timeout?: number

  /** Retry attempts on network errors. Default: 3. */
  retries?: number
}
```

## Usage

### Recording changes

#### Full state (server computes the diff)

```typescript
const response = await letopis.ingest('crm.deals', 'd-1')
  .authorId('42')
  .source('crm-prod')                   // overrides the global source
  .tsSource('2026-06-11T10:00:00Z')
  .meta({ ip: '10.1.2.3' })
  .state({ title: 'Deal #1', amount: 250 })

response.status      // 'accepted' | 'created' | 'no_changes'
response.ticketId    // present when status = 'accepted' (202)
response.version     // present when status = 'created' (strict mode, 201)
```

#### Pre-computed diff

```typescript
import { change } from 'letopis-node'

await letopis.ingest('crm.deals', 'd-1')
  .authorId('42')
  .diff([
    change.change('amount', 100, 250),
    change.add('tags[0]', 'vip'),
    change.remove('items[2]', { sku: 'X1' }),
  ])
```

#### Delete

```typescript
await letopis.ingest('crm.deals', 'd-1').authorId('42').delete()
```

#### Reliability mode per request

```typescript
await letopis.ingest('crm.deals', 'd-1').strict().state(...)   // 201 — synchronous write
await letopis.ingest('crm.deals', 'd-1').durable().state(...)  // 202 — Redis queue
await letopis.ingest('crm.deals', 'd-1').fast().state(...)     // 202 — in-memory queue
```

#### Idempotency & optimistic locking

```typescript
await letopis.ingest('crm.deals', 'd-1')
  .idempotencyKey('my-system-event-981')   // or .eventId(...)
  .expectedVersion(16)                      // 409 if current version ≠ 16
  .state({ ... })
```

#### Linking to a business flow

```typescript
await letopis.ingest('crm.deals', 'd-1')
  .flow({ flowId: 'f_01J...', causedBy: [{ activityId: 'act-7' }], step: 'deal-approved' })
  .state({ ... })
```

---

### Batch ingest

```typescript
const result = await letopis.batch()
  .addState('crm.deals',    'd-1', { amount: 100 }, { author_id: '42' })
  .addState('crm.deals',    'd-2', { amount: 200 })
  .addDiff('crm.contracts', 'c-5', [change.change('status', 'draft', 'signed')])
  .addDelete('crm.leads',   'l-9')
  .send()

result.accepted          // number of accepted events
result.rejected          // array of { index, errorCode, errorMessage }
```

---

### Reading history

```typescript
const history = await letopis.history('crm.deals', 'd-1')
  .limit(50)
  .from('2026-01-01T00:00:00Z')
  .to('2026-06-30T23:59:59Z')
  .authorId('42')
  .op('update')
  .path('amount')          // filter by changed field
  .orderBy('version', 'desc')
  .get()

for (const event of history.events) {
  console.log(`v${event.version} by ${event.authorId}: ${event.op}`)
  for (const c of event.changes) {
    console.log(`  ${c.path}: ${c.old} → ${c.new}`)
  }
}

// Cursor pagination
if (history.nextCursor) {
  const next = await letopis.history('crm.deals', 'd-1').cursor(history.nextCursor).get()
}
```

#### Current and point-in-time state

```typescript
const current = await letopis.state('crm.deals', 'd-1')

const atVersion = await letopis.stateAtVersion('crm.deals', 'd-1', 12)
const atTime    = await letopis.stateAt('crm.deals', 'd-1', '2026-06-01T00:00:00Z')

atTime.version              // resolved version
atTime.deleted              // true if entity was deleted at that point
atTime.state                // reconstructed field values
atTime.reconstructedFrom    // { snapshotVersion, eventsApplied }
```

---

### Async ticket status

```typescript
const response = await letopis.ingest('crm.deals', 'd-1').durable().state({ ... })

const ticket = await letopis.ticket(response.ticketId!)

ticket.status   // 'accepted' | 'processing' | 'stored' | 'failed' | 'partial'
ticket.error    // present when status = 'failed'
```

---

### Collections

```typescript
const { collections } = await letopis.collections()

for (const col of collections) {
  console.log(`${col.name}: ${col.entities} entities, ${col.events} events`)
}
```

---

### Activities and flows

```typescript
// Record an activity
const response = await letopis.activity()
  .type('recalc.prices')
  .authorId('42')
  .source('billing-svc')
  .flowId('f_01J...')       // omit to let the server create a new flow
  .causedBy([{ collection: 'crm.deals', entityId: 'd-1', eventId: 'src-evt-981' }])
  .data({ recalced: 17, duration_ms: 840 })
  .create()

console.log(response.activityId, response.flowId)

// Read the flow (all events + activities as a DAG)
const flow = await letopis.flow('f_01J...')

for (const node of flow.nodes) {
  if (node.kind === 'event') {
    console.log(`Event v${node.version} on ${node.collection}/${node.entityId}`)
  } else {
    console.log(`Activity: ${node.type}`)
  }
}
```

---

### Rules (webhook triggers)

```typescript
await letopis.rules('crm.deals').create({
  name:    'alert-on-amount-drop',
  enabled: true,
  condition: {
    all: [
      { field: 'op', eq: 'update' },
      { field: 'changes', match: { path: 'status', old: 'active', new: 'cancelled' } },
    ],
  },
  actions: [{
    type:       'webhook',
    url:        'https://your-app.example.com/hooks/letopis',
    secret_ref: 'whsec_1',
    timeout_ms: 5000,
    retry:      { max_attempts: 8, backoff: 'exponential' },
  }],
})

await letopis.rules('crm.deals').list()
await letopis.rules('crm.deals').get('rule_01J...')
await letopis.rules('crm.deals').update('rule_01J...', { enabled: false })
await letopis.rules('crm.deals').delete('rule_01J...')

// DLQ
const { items } = await letopis.rules('crm.deals').dlq('rule_01J...')
await letopis.rules('crm.deals').redeliver('rule_01J...')
await letopis.rules('crm.deals').redeliver('rule_01J...', ['dlq_id_1', 'dlq_id_2'])
```

---

### Verifying webhook signatures

```typescript
import { verifyWebhookSignature } from 'letopis-node'

// Express example
app.post('/hooks/letopis', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    verifyWebhookSignature(
      process.env.LETOPIS_WEBHOOK_SECRET!,
      req.body,                         // raw Buffer — do NOT call JSON.parse first
      req.headers['x-hm-signature'] as string,
    )
  } catch {
    return res.status(401).send('Invalid signature')
  }

  const payload = JSON.parse(req.body.toString())
  // process payload...
  res.sendStatus(200)
})
```

---

### Collection configuration

```typescript
const config = await letopis.collectionConfig('crm.deals').get()

await letopis.collectionConfig('crm.deals').put({
  reliability_mode:  'strict',
  snapshot_interval: 50,
  plugins: { hash_chain: { enabled: true } },
})
```

---

### Hash-chain integrity

```typescript
const result = await letopis.verify('crm.deals', 'd-1')

if (!result.valid) {
  console.error(`Chain broken at version ${result.brokenAtVersion}`)
}

// Collection-wide (async — returns a ticket)
const { ticketId } = await letopis.verifyCollection('crm.deals')
```

---

## NestJS integration

Import from the subpath `letopis-node/nestjs`. NestJS is a peer dependency and only
needed if you use this subpath.

### Module setup

```typescript
// app.module.ts
import { LetopisModule } from 'letopis-node/nestjs'

@Module({
  imports: [
    LetopisModule.forRoot({
      baseUrl:     process.env.LETOPIS_BASE_URL!,
      apiKey:      process.env.LETOPIS_API_KEY!,
      source:      'my-nestjs-app',
      defaultMode: 'durable',
    }),
  ],
})
export class AppModule {}
```

Async registration (use when config comes from `ConfigService`):

```typescript
import { LetopisModule } from 'letopis-node/nestjs'
import { ConfigService } from '@nestjs/config'

LetopisModule.forRootAsync({
  inject:      [ConfigService],
  useFactory:  (cfg: ConfigService) => ({
    baseUrl: cfg.getOrThrow('LETOPIS_BASE_URL'),
    apiKey:  cfg.getOrThrow('LETOPIS_API_KEY'),
    source:  cfg.get('APP_NAME', 'nestjs-app'),
  }),
})
```

### Injecting the client

```typescript
import { Injectable } from '@nestjs/common'
import { InjectLetopis } from 'letopis-node/nestjs'
import { LetopisClient, change } from 'letopis-node'

@Injectable()
export class DealService {
  constructor(@InjectLetopis() private readonly letopis: LetopisClient) {}

  async close(dealId: string, userId: string): Promise<void> {
    await this.letopis
      .ingest('crm.deals', dealId)
      .authorId(userId)
      .diff([change.change('status', 'open', 'closed')])
  }

  async getDealHistory(dealId: string) {
    return this.letopis
      .history('crm.deals', dealId)
      .orderBy('version', 'asc')
      .get()
  }
}
```

### TypeORM subscriber (automatic change recording)

For applications using TypeORM, create a subscriber that records entity changes
using the SDK:

```typescript
import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  RemoveEvent,
  DataSource,
} from 'typeorm'
import { Injectable } from '@nestjs/common'
import { InjectLetopis } from 'letopis-node/nestjs'
import { LetopisClient } from 'letopis-node'
import { InjectDataSource } from '@nestjs/typeorm'

@Injectable()
@EventSubscriber()
export class DealHistorySubscriber implements EntitySubscriberInterface<Deal> {
  constructor(
    @InjectDataSource() dataSource: DataSource,
    @InjectLetopis() private readonly letopis: LetopisClient,
  ) {
    dataSource.subscribers.push(this)
  }

  listenTo() { return Deal }

  async afterInsert(event: InsertEvent<Deal>): Promise<void> {
    await this.letopis
      .ingest('crm.deals', String(event.entity.id))
      .op('create')
      .state(event.entity as Record<string, unknown>)
      .catch(err => console.error('Letopis afterInsert failed', err))
  }

  async afterUpdate(event: UpdateEvent<Deal>): Promise<void> {
    if (!event.entity) return

    const changes = (event.updatedColumns ?? []).map(col => ({
      path: col.propertyName,
      op:   'change' as const,
      old:  event.databaseEntity?.[col.propertyName as keyof Deal],
      new:  event.entity![col.propertyName as keyof Deal],
    }))

    if (changes.length === 0) return

    await this.letopis
      .ingest('crm.deals', String(event.entity.id))
      .diff(changes)
      .catch(err => console.error('Letopis afterUpdate failed', err))
  }

  async afterRemove(event: RemoveEvent<Deal>): Promise<void> {
    if (!event.entityId) return

    await this.letopis
      .ingest('crm.deals', String(event.entityId))
      .delete()
      .catch(err => console.error('Letopis afterRemove failed', err))
  }
}
```

Register the subscriber in your module's `providers` array. Errors are caught
and logged so that a Letopis failure never breaks a database write.

---

## Testing

Use `FakeLetopisClient` from `letopis-node/testing` to record calls without
making HTTP requests.

```typescript
import { FakeLetopisClient } from 'letopis-node/testing'

describe('DealService', () => {
  let letopis: FakeLetopisClient
  let service: DealService

  beforeEach(() => {
    letopis = new FakeLetopisClient()
    service = new DealService(letopis)     // inject the fake
  })

  it('records a state change when closing a deal', async () => {
    await service.close('d-1', 'user-42')

    letopis.assertIngestedDiff('crm.deals', 'd-1')
  })

  it('sends a batch during import', async () => {
    await service.importDeals(deals)

    letopis.assertBatchSent()
  })

  it('records an activity after price recalculation', async () => {
    await service.recalcPrices()

    letopis.assertActivityCreated('recalc.prices')
  })

  it('does nothing on a cache hit', async () => {
    await service.getCachedDeal('d-1')   // should use cache, not Letopis

    letopis.assertNothingSent()
  })
})
```

#### With NestJS testing module

```typescript
import { Test } from '@nestjs/testing'
import { LETOPIS_CLIENT } from 'letopis-node/nestjs'
import { FakeLetopisClient } from 'letopis-node/testing'

const moduleRef = await Test.createTestingModule({
  providers: [
    DealService,
    { provide: LETOPIS_CLIENT, useValue: new FakeLetopisClient() },
  ],
}).compile()

const fake = moduleRef.get<FakeLetopisClient>(LETOPIS_CLIENT)
```

#### Available assertions

| Method | What it checks |
|---|---|
| `assertIngestedState(col, eid)` | A state POST was sent |
| `assertIngestedDiff(col, eid)` | A diff POST was sent |
| `assertDeleted(col, eid)` | A delete POST was sent |
| `assertBatchSent()` | A `/events:batch` request was sent |
| `assertActivityCreated(type?)` | An activity was created (optionally by type) |
| `assertNothingSent()` | No requests were made |
| `recordedCalls()` | Returns all recorded calls for custom assertions |

---

## Error handling

```typescript
import {
  LetopisError,
  ConflictError,
  RateLimitError,
  NotFoundError,
} from 'letopis-node'

try {
  await letopis.ingest('crm.deals', 'd-1')
    .expectedVersion(16)
    .state({ ... })
} catch (err) {
  if (err instanceof ConflictError) {
    // version mismatch — reload and retry
  } else if (err instanceof RateLimitError) {
    await setTimeout(err.retryAfter * 1000)
    // retry...
  } else if (err instanceof LetopisError) {
    console.error(err.code, err.httpStatus, err.message)
  }
}
```

| Class | HTTP | When |
|---|---|---|
| `ValidationError` | 400 | Invalid request body or parameters |
| `AuthenticationError` | 401 | Missing or invalid API key |
| `AuthorizationError` | 403 | Insufficient scope or collection access |
| `NotFoundError` | 404 | Entity, collection, or ticket not found |
| `ConflictError` | 409 | Version mismatch or duplicate idempotency key |
| `PayloadTooLargeError` | 413 | Event exceeds the size limit |
| `PluginRejectionError` | 422 | Rejected by a fail-closed plugin (e.g. hash-chain) |
| `RateLimitError` | 429 | Rate limit or backpressure; check `.retryAfter` |
| `ServerError` | 503 | Server or database unavailable |
| `LetopisError` | — | Base class for all of the above |

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). This project follows a [Code of Conduct](CODE_OF_CONDUCT.md); to report a security issue, see [SECURITY.md](SECURITY.md) rather than opening a public issue.

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE). "Letopis" is a trademark; see the [trademark guidelines](https://github.com/max-trifonov/letopis/blob/main/TRADEMARK.md).
