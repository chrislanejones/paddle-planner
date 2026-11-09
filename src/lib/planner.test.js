import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DAY, HOUR, computeWindows, currentEvents, findTurns, forecastDays, km, nearbyStations, offsetLine,
  outTowardInlet, parseNoaa, routeMid, stationKey, sunTimes, tideEvents, valueAt, windAt, ymd,
} from './planner.js'
import { PRESETS } from './routes.js'

const route = id => PRESETS.find(r => r.id === id)

test('ymd and parseNoaa treat NOAA GMT strings as UTC', () => {
  assert.equal(ymd(Date.UTC(2026, 10, 8, 23, 59)), '20261108')
  assert.equal(parseNoaa('2026-11-08 06:30'), Date.UTC(2026, 10, 8, 6, 30))
})

test('forecastDays returns eight Eastern midnights', () => {
  const days = forecastDays(new Date('2026-11-08T15:00:00Z')) // EST, UTC-5
  assert.equal(days.length, 8)
  assert.equal(days[0], Date.UTC(2026, 10, 8, 5))
  days.slice(1).forEach((d, i) => assert.equal(d - days[i], DAY))
})

test('forecastDays keeps real day lengths across the DST change', () => {
  const days = forecastDays(new Date('2026-10-30T15:00:00Z')) // fall back on 11-01
  assert.equal(days[0], Date.UTC(2026, 9, 30, 4)) // midnight EDT, UTC-4
  assert.equal(days[3], Date.UTC(2026, 10, 2, 5)) // midnight EST, UTC-5
  assert.equal(days[3] - days[2], 25 * HOUR)
})

test('valueAt interpolates with a cosine ease and returns null outside the data', () => {
  const events = [{ t: 0, v: 0 }, { t: HOUR, v: 1 }]
  assert.equal(valueAt(events, 0), 0)
  assert.ok(Math.abs(valueAt(events, HOUR / 2) - 0.5) < 1e-12)
  assert.equal(valueAt(events, -1), null)
  assert.equal(valueAt(events, 2 * HOUR), null)
})

test('windAt matches the hour that contains the time', () => {
  const wind = [{ t: 0, end: HOUR, mph: 5 }, { t: HOUR, end: 2 * HOUR, mph: 9 }]
  assert.equal(windAt(wind, HOUR - 1).mph, 5)
  assert.equal(windAt(wind, HOUR).mph, 9)
  assert.equal(windAt(wind, 3 * HOUR), null)
})

test('currentEvents signs ebb negative, flood positive, slack zero, and drops bad rows', () => {
  const events = currentEvents([
    { Time: '2026-11-08 03:00', Velocity_Major: '1.2', Type: 'flood' },
    { Time: '2026-11-08 00:00', Velocity_Major: '-0.9', Type: 'ebb' },
    { Time: '2026-11-08 01:30', Velocity_Major: '0.0', Type: 'slack' },
    { Time: 'garbage', Velocity_Major: 'x', Type: 'flood' },
  ])
  assert.deepEqual(events.map(e => e.v), [-0.9, 0, 1.2])
})

test('tideEvents puts slack on each tide and maximum current halfway between', () => {
  const events = tideEvents([{ t: 0, type: 'H' }, { t: 6 * HOUR, type: 'L' }, { t: 12 * HOUR, type: 'H' }])
  assert.deepEqual(events.map(e => [e.t / HOUR, e.v]), [[0, 0], [3, -1], [6, 0], [9, 1], [12, 0]])
})

test('findTurns reports the slack between opposite currents', () => {
  const turns = findTurns([{ t: 0, v: -1 }, { t: HOUR, v: 0 }, { t: 2 * HOUR, v: 1 }])
  assert.deepEqual(turns, [{ t: HOUR, from: -1 }])
})

test('findTurns interpolates when the turn has no slack row', () => {
  const [turn] = findTurns([{ t: 0, v: -1 }, { t: 2 * HOUR, v: 1 }])
  assert.equal(turn.from, -1)
  assert.ok(Math.abs(turn.t - HOUR) < 1)
})

test('outTowardInlet follows the geometry of each preset', () => {
  assert.equal(outTowardInlet(route('bayfront').pts).toward, false)
  assert.equal(outTowardInlet(route('saltrun').pts).toward, true)
  assert.equal(outTowardInlet(route('matanzas').pts).inlet.name, 'Matanzas Inlet')
})

test('routeMid handles odd and even point counts', () => {
  assert.deepEqual(routeMid([[0, 0], [1, 1], [2, 2]]), { lat: 1, lng: 1 })
  assert.deepEqual(routeMid([[0, 0], [2, 4]]), { lat: 1, lng: 2 })
})

test('km is zero for the same point and about 111 km per degree of latitude', () => {
  assert.equal(km({ lat: 29, lng: -81 }, { lat: 29, lng: -81 }), 0)
  assert.ok(Math.abs(km({ lat: 29, lng: -81 }, { lat: 30, lng: -81 }) - 111.2) < 0.5)
})

test('offsetLine shifts the return leg to the right of travel', () => {
  const [a] = offsetLine([[30, -81], [30.01, -81]], 45) // heading north: right side is east
  assert.ok(a[1] > -81)
  assert.ok(Math.abs(a[0] - 30) < 1e-9)
})

test('sunTimes gives a plausible St. Augustine day in November', () => {
  const day = Date.UTC(2026, 10, 8, 5)
  const { rise, set } = sunTimes(day, 29.9, -81.3)
  const hours = t => (t - day) / HOUR
  assert.ok(hours(rise) > 6 && hours(rise) < 7.5, `sunrise ${hours(rise)}h after midnight`)
  assert.ok(hours(set) > 16.5 && hours(set) < 18, `sunset ${hours(set)}h after midnight`)
})

test('nearbyStations dedupes by id and bin and keeps six at most', () => {
  const mid = routeMid(route('bayfront').pts)
  const stations = Array.from({ length: 10 }, (_, i) => ({ id: `S${i}`, bin: 1, lat: mid.lat + i / 100, lng: mid.lng }))
  stations.push({ ...stations[0] })
  const near = nearbyStations(stations, route('bayfront'))
  assert.equal(near.length, 6)
  assert.equal(new Set(near.map(stationKey)).size, 6)
  assert.equal(near[0].id, 'S0')
})

test('computeWindows centers each trip on the slack where the current flips', () => {
  const day = Date.UTC(2026, 10, 8, 5) // Eastern midnight
  const at = h => day + h * HOUR
  // bayfront heads away from the inlet, so its out leg rides the flood and turns at flood-to-ebb slack
  const events = [[4, 1], [10, 0], [16, -1], [22, 0], [28, 1], [34, 0], [40, -1]].map(([h, v]) => ({ t: at(h), v }))
  const windows = computeWindows({ events, wind: [], route: route('bayfront'), day, nextDay: day + DAY, duration: 2 })
  assert.equal(windows.length, 1)
  const [w] = windows
  assert.equal(w.turn, at(10))
  assert.equal(w.launch, at(9))
  assert.equal(w.back, at(11))
  assert.equal(w.daylight, true)
  assert.ok(w.peak > 0 && w.peak < 0.2, `peak ${w.peak}`)
})

test('computeWindows skips trips the predictions cannot cover and attaches the windiest hour', () => {
  const day = Date.UTC(2026, 10, 8, 5)
  const at = h => day + h * HOUR
  const events = [{ t: at(8), v: 1 }, { t: at(10), v: 0 }, { t: at(10.5), v: -1 }]
  const wind = [{ t: at(9), end: at(10), mph: 8, dir: 'NE' }, { t: at(10), end: at(11), mph: 14, dir: 'E' }]
  assert.deepEqual(computeWindows({ events, wind, route: route('bayfront'), day, nextDay: day + DAY, duration: 3 }), [])
  const [w] = computeWindows({ events, wind, route: route('bayfront'), day, nextDay: day + DAY, duration: 1 })
  assert.equal(w.wind.mph, 14)
})
