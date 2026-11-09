import test from 'node:test'
import assert from 'node:assert/strict'
import { PRESETS, TIDE_STATIONS } from './routes.js'
import { km, nearestBy, point, routeMid } from './planner.js'

test('preset route ids are unique and every route has a name', () => {
  const ids = PRESETS.map(r => r.id)
  assert.equal(new Set(ids).size, ids.length)
  PRESETS.forEach(r => assert.ok(r.name.length > 10, `${r.id} needs a descriptive name`))
})

test('preset routes are well-formed and sit between Palm Coast and the Georgia line', () => {
  PRESETS.forEach(r => {
    assert.ok(r.pts.length >= 2, `${r.id} needs at least two points`)
    r.pts.forEach(([lat, lng]) => {
      assert.ok(lat > 29.5 && lat < 30.8 && lng > -81.8 && lng < -81.15, `${r.id} has a point outside the area: ${lat},${lng}`)
    })
    r.pts.slice(1).forEach((p, i) => {
      const gap = km(point(r.pts[i]), point(p))
      assert.ok(gap < 2.5, `${r.id} jumps ${gap.toFixed(2)} km between points ${i} and ${i + 1}`)
    })
  })
})

test('every preset route has a tide station within 25 km for the fallback estimate', () => {
  PRESETS.forEach(r => {
    const [nearest] = nearestBy(TIDE_STATIONS, routeMid(r.pts))
    assert.ok(nearest.d < 25, `${r.id} is ${nearest.d.toFixed(1)} km from ${nearest.name}`)
  })
})

test('every preset route belongs to a region the route picker lists', () => {
  const regions = new Set(['Nassau County', 'Duval County', 'St. Johns County', 'Flagler County'])
  PRESETS.forEach(r => assert.ok(regions.has(r.region), `${r.id} has an unknown region: ${r.region}`))
})
