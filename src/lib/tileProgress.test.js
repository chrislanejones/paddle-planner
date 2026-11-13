import test from 'node:test'
import assert from 'node:assert/strict'
import { createTileTracker } from './tileProgress.js'

const tile = (retries) => ({ retries })

test('counts loading and loaded tiles', () => {
  const t = createTileTracker()
  const [a, b, c] = [tile(), tile(), tile()]
  ;[a, b, c].forEach(t.start)
  t.done(a)
  assert.deepEqual(t.summary(), { total: 3, done: 1, pending: 2, retrying: 0, failed: 0 })
})

test('a tile waiting on a retry is still pending, and says so', () => {
  const t = createTileTracker()
  const a = tile(2)
  t.start(a)
  t.error(a)
  assert.deepEqual(t.summary(), { total: 1, done: 0, pending: 1, retrying: 1, failed: 0 })
  t.done(a)
  assert.equal(t.summary().pending, 0)
})

test('a tile past the retry limit is failed, not pending', () => {
  const t = createTileTracker(6)
  const a = tile(7)
  t.start(a)
  t.error(a)
  assert.deepEqual(t.summary(), { total: 0, done: 0, pending: 0, retrying: 0, failed: 1 })
})

test('a layer that never retries fails on the first error', () => {
  const t = createTileTracker()
  const a = {}
  t.start(a)
  t.error(a)
  assert.equal(t.summary().failed, 1)
})

test('loaded tiles are forgotten once everything settles, so the next pan counts from zero', () => {
  const t = createTileTracker()
  const [a, b] = [tile(), tile()]
  t.start(a)
  t.done(a)
  assert.equal(t.summary().pending, 0)
  t.start(b)
  assert.deepEqual(t.summary(), { total: 1, done: 0, pending: 1, retrying: 0, failed: 0 })
})

test('unloading a failed tile clears the warning', () => {
  const t = createTileTracker()
  const a = tile(9)
  t.start(a)
  t.error(a)
  t.unload(a)
  assert.equal(t.summary().failed, 0)
})
