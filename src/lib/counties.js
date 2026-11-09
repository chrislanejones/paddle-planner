import { SHAPES } from './countyShapes.js'

// The seven First Coast counties, north to south along the coast. Each is split into sections, one dot on the
// county map. A section with a place name uses it; where a county has no obvious place, a compass name stands in.
// A route belongs to the section whose dot is closest to its launch point, so the dots divide the county.
export const COUNTIES = [
  { name: 'Nassau', sections: [
    { name: 'Amelia Island',   lat: 30.63, lng: -81.45 },
    { name: 'Yulee',           lat: 30.63, lng: -81.58 },
    { name: 'St. Marys River', lat: 30.69, lng: -81.77 },
    { name: 'Callahan',        lat: 30.56, lng: -81.83 },
    { name: 'West Nassau',     lat: 30.55, lng: -82.00 },
  ] },
  { name: 'Duval', sections: [
    { name: 'Mayport',          lat: 30.40, lng: -81.43 },
    { name: 'Beaches',          lat: 30.28, lng: -81.42 },
    { name: 'Northside',          lat: 30.45, lng: -81.62 },
    { name: 'Downtown',         lat: 30.32, lng: -81.66 },
    { name: 'Southside',        lat: 30.18, lng: -81.55 },
    { name: 'Westside',         lat: 30.30, lng: -81.82 },
    { name: 'Northwest',  lat: 30.45, lng: -81.85 },
  ] },
  { name: 'St. Johns', sections: [
    { name: 'Ponte Vedra',     lat: 30.20, lng: -81.38 },
    { name: 'Fruit Cove',      lat: 30.09, lng: -81.58 },
    { name: 'Guana',           lat: 30.00, lng: -81.32 },
    { name: 'St. Augustine',   lat: 29.90, lng: -81.32 },
    { name: 'Anastasia Island', lat: 29.86, lng: -81.27 },
    { name: 'Matanzas',        lat: 29.72, lng: -81.24 },
    { name: 'West St. Johns',  lat: 29.80, lng: -81.50 },
  ] },
  { name: 'Flagler', sections: [
    { name: 'Pellicer Creek',  lat: 29.64, lng: -81.25 },
    { name: 'Palm Coast',      lat: 29.55, lng: -81.20 },
    { name: 'Flagler Beach',   lat: 29.47, lng: -81.13 },
    { name: 'Bunnell',         lat: 29.47, lng: -81.26 },
    { name: 'West Flagler',    lat: 29.45, lng: -81.42 },
  ] },
  { name: 'Clay', sections: [
    { name: 'Orange Park',     lat: 30.15, lng: -81.74 },
    { name: 'Fleming Island',  lat: 30.09, lng: -81.70 },
    { name: 'Middleburg',      lat: 30.07, lng: -81.87 },
    { name: 'Green Cove Springs', lat: 29.99, lng: -81.68 },
    { name: 'Kingsley Lake',   lat: 29.96, lng: -81.97 },
    { name: 'Keystone Heights', lat: 29.79, lng: -82.00 },
  ] },
  { name: 'Putnam', sections: [
    { name: 'Palatka',         lat: 29.65, lng: -81.64 },
    { name: 'Welaka',          lat: 29.48, lng: -81.67 },
    { name: 'Crescent Lake',   lat: 29.45, lng: -81.55 },
    { name: 'Ocklawaha River', lat: 29.55, lng: -81.88 },
    { name: 'Interlachen',     lat: 29.64, lng: -81.90 },
  ] },
  { name: 'Baker', sections: [
    { name: 'North Baker',     lat: 30.45, lng: -82.30 },
    { name: 'Macclenny',       lat: 30.28, lng: -82.12 },
    { name: 'Olustee',         lat: 30.23, lng: -82.38 },
  ] },
]

export const countyNames = COUNTIES.map(c => c.name)
export const countyByName = name => COUNTIES.find(c => c.name === name)

// Outline helpers: rings are [lng, lat].
export const outlineOf = name => SHAPES[name] ?? []

export function ringsBounds(rings) {
  let west = Infinity, east = -Infinity, south = Infinity, north = -Infinity
  for (const ring of rings) for (const [lng, lat] of ring) {
    west = Math.min(west, lng); east = Math.max(east, lng); south = Math.min(south, lat); north = Math.max(north, lat)
  }
  return { west, east, south, north }
}

export function inRing(ring, lng, lat) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
export const inCounty = (name, lat, lng) => outlineOf(name).some(ring => inRing(ring, lng, lat))

// Squared distance in kilometers, good enough to pick the closest dot.
const kmSq = (a, b) => ((a.lat - b.lat) * 111.2) ** 2 + ((a.lng - b.lng) * 111.2 * Math.cos(a.lat * Math.PI / 180)) ** 2

export function sectionOf(route) {
  const county = countyByName(route.county)
  if (!county) return null
  const launch = { lat: route.pts[0][0], lng: route.pts[0][1] }
  return county.sections.reduce((best, s) => (kmSq(launch, s) < kmSq(launch, best) ? s : best), county.sections[0]).name
}

// A river that forms a county line can sit just across it. This counts a point within `km` of the county as near.
export function nearCounty(name, lat, lng, km = 2.5) {
  if (inCounty(name, lat, lng)) return true
  const cos = Math.cos(lat * Math.PI / 180)
  return outlineOf(name).some(ring => ring.some(([x, y]) => Math.hypot((y - lat) * 111.2, (x - lng) * 111.2 * cos) <= km))
}
