import { FakeLetopisClient } from '../src/testing/fake.js'

describe('FakeLetopisClient', () => {
  test('records an ingested state and lets the assertion find it', async () => {
    const fake = new FakeLetopisClient()

    await fake.ingest('crm.deals', 'd-1').state({ title: 'Acme Corp', amount: 5000 })

    fake.assertIngestedState('crm.deals', 'd-1')
    expect(() => fake.assertIngestedState('crm.deals', 'd-2')).toThrow()
  })

  test('records an ingested diff separately from a full state', async () => {
    const fake = new FakeLetopisClient()

    await fake.ingest('crm.deals', 'd-1').diff([{ path: 'amount', op: 'change', old: 5000, new: 6000 }])

    fake.assertIngestedDiff('crm.deals', 'd-1')
    expect(() => fake.assertIngestedState('crm.deals', 'd-1')).toThrow()
  })

  test('records a delete', async () => {
    const fake = new FakeLetopisClient()

    await fake.ingest('crm.deals', 'd-1').delete()

    fake.assertDeleted('crm.deals', 'd-1')
  })

  test('records a batch send', async () => {
    const fake = new FakeLetopisClient()

    await fake.batch().send()

    fake.assertBatchSent()
  })

  test('records an activity, matched by type', async () => {
    const fake = new FakeLetopisClient()

    await fake.activity().type('recalc.prices').create()

    fake.assertActivityCreated('recalc.prices')
    expect(() => fake.assertActivityCreated('other.type')).toThrow()
  })

  test('assertNothingSent fails once any call is recorded', async () => {
    const fake = new FakeLetopisClient()
    fake.assertNothingSent()

    await fake.ingest('crm.deals', 'd-1').state({})

    expect(() => fake.assertNothingSent()).toThrow()
  })

  test('recordedCalls exposes a defensive copy', async () => {
    const fake = new FakeLetopisClient()
    await fake.ingest('crm.deals', 'd-1').state({})

    const calls = fake.recordedCalls()
    calls.push({ method: 'tampered' })

    expect(fake.recordedCalls()).toHaveLength(1)
  })
})
