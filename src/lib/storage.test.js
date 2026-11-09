import test from 'node:test'
import assert from 'node:assert/strict'
import { savedRoute, storage } from './storage.js'

function fakeStorage(initial = {}) {
  const data = { ...initial }
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: key => data[key] ?? null,
      setItem: (key, value) => { data[key] = String(value) },
      removeItem: key => { delete data[key] },
    },
  })
  return data
}

test('storage round-trips JSON and swallows corrupt values', () => {
  const data = fakeStorage()
  assert.equal(storage.set('k', { a: 1 }), true)
  assert.deepEqual(storage.get('k'), { a: 1 })
  data.bad = '{not json'
  assert.equal(storage.get('bad'), null)
  assert.equal(storage.remove('k'), true)
  assert.equal(storage.get('k'), null)
})

test('savedRoute accepts a valid custom route', () => {
  fakeStorage({ pp_custom_route: JSON.stringify({ pts: [[29.9, -81.3], [29.8, -81.2]] }) })
  assert.deepEqual(savedRoute(), { id: 'custom', name: 'My route', pts: [[29.9, -81.3], [29.8, -81.2]] })
})

test('savedRoute rejects short, malformed, and out-of-range routes', () => {
  for (const pts of [[[29.9, -81.3]], [[29.9], [29.8, -81.2]], [['29.9', -81.3], [29.8, -81.2]], [[99, -81.3], [29.8, -81.2]], [[29.9, -181], [29.8, -81.2]]]) {
    fakeStorage({ pp_custom_route: JSON.stringify({ pts }) })
    assert.equal(savedRoute(), null, JSON.stringify(pts))
  }
  fakeStorage()
  assert.equal(savedRoute(), null)
})
