import { change } from '../src/types.js'

describe('change helpers', () => {
  test('add builds an add op with only the new value', () => {
    expect(change.add('title', 'Acme Corp')).toEqual({
      path: 'title',
      op: 'add',
      new: 'Acme Corp',
    })
  })

  test('change builds a change op with old and new values', () => {
    expect(change.change('amount', 5000, 6000)).toEqual({
      path: 'amount',
      op: 'change',
      old: 5000,
      new: 6000,
    })
  })

  test('remove builds a remove op with only the old value', () => {
    expect(change.remove('stage', 'prospect')).toEqual({
      path: 'stage',
      op: 'remove',
      old: 'prospect',
    })
  })
})
