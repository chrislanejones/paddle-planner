import test from 'node:test'
import assert from 'node:assert/strict'
import { fmtClock, fmtDayChip, fmtTripTime } from './planner.js'

const day = Date.UTC(2026, 10, 8, 5) // Sunday 11-08-2026 midnight Eastern (EST)

test('fmtClock drops the zone suffix and uses Eastern time', () => {
  assert.equal(fmtClock(Date.UTC(2026, 10, 8, 11, 3)), '6:03 AM')
})

test('fmtTripTime adds the date only when the time falls on another day', () => {
  assert.equal(fmtTripTime(Date.UTC(2026, 10, 8, 23, 30), day), '6:30 PM')
  assert.equal(fmtTripTime(Date.UTC(2026, 10, 9, 5, 30), day), 'Nov 9 · 12:30 AM')
})

test('fmtDayChip gives a short weekday and date in Eastern time', () => {
  assert.deepEqual(fmtDayChip(day), { weekday: 'Sun', date: 'Nov 8' })
})
