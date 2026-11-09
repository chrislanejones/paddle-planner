import test from 'node:test'
import assert from 'node:assert/strict'
import { PRESETS, TIDE_STATIONS } from './routes.js'
import { isTidal, km, nearestBy, point, routeMid } from './planner.js'
import { COUNTIES, countyByName, inCounty, nearCounty, sectionOf } from './counties.js'

test('preset route ids are unique and every route has a name', () => {
  const ids = PRESETS.map(r => r.id)
  assert.equal(new Set(ids).size, ids.length)
  PRESETS.forEach(r => assert.ok(r.name.length > 10, `${r.id} needs a descriptive name`))
})

test('preset routes are well-formed and sit inside the seven First Coast counties', () => {
  PRESETS.forEach(r => {
    assert.ok(r.pts.length >= 2, `${r.id} needs at least two points`)
    r.pts.forEach(([lat, lng]) => {
      assert.ok(lat > 29.3 && lat < 30.85 && lng > -82.5 && lng < -81.0, `${r.id} has a point outside the area: ${lat},${lng}`)
    })
    r.pts.slice(1).forEach((p, i) => {
      const gap = km(point(r.pts[i]), point(p))
      assert.ok(gap < 4, `${r.id} jumps ${gap.toFixed(2)} km between points ${i} and ${i + 1}`)
    })
  })
})

test('every tidal preset route has a tide station within 25 km for the fallback estimate', () => {
  PRESETS.filter(isTidal).forEach(r => {
    const [nearest] = nearestBy(TIDE_STATIONS, routeMid(r.pts))
    assert.ok(nearest.d < 25, `${r.id} is ${nearest.d.toFixed(1)} km from ${nearest.name}`)
  })
})

test('every preset route touches the county it is filed under', () => {
  PRESETS.forEach(r => {
    assert.ok(countyByName(r.county), `${r.id} has an unknown county: ${r.county}`)
    // A river that forms a county line (the St. Johns, the St. Marys prongs) can run just across it, so near counts.
    assert.ok(r.pts.some(([lat, lng]) => nearCounty(r.county, lat, lng)), `${r.id} is nowhere near ${r.county} County`)
    assert.ok(countyByName(r.county).sections.some(s => s.name === sectionOf(r)), `${r.id} has no section`)
  })
})

test('rivers that do not follow the tide say which way the out leg runs', () => {
  PRESETS.filter(r => !isTidal(r)).forEach(r => assert.ok(['with', 'against'].includes(r.flow), `${r.id} needs flow: 'with' or 'against'`))
})

test('the best-of list opens with the St. Augustine bayfront and spans several counties', () => {
  const best = PRESETS.filter(r => r.best)
  assert.equal(best[0].id, 'bayfront')
  assert.ok(new Set(best.map(r => r.county)).size >= 5, 'best routes should spread across counties')
})

test('every county has sections whose dots sit inside it', () => {
  COUNTIES.forEach(c => {
    assert.equal(new Set(c.sections.map(s => s.name)).size, c.sections.length, `${c.name} repeats a section name`)
    c.sections.forEach(s => assert.ok(inCounty(c.name, s.lat, s.lng), `${c.name} / ${s.name} is outside the county`))
  })
})
