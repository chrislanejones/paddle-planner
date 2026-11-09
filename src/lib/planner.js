import { INLETS } from './routes.js'

export const TZ = 'America/New_York'
export const HOUR = 3_600_000
export const DAY = 24 * HOUR
const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric',
  hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
})

// UTC instants throughout: trip lengths remain correct across DST transitions.
function wallTime(date) {
  const p = Object.fromEntries(partsFormat.formatToParts(date).map(part => [part.type, part.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second)
}

function easternMidnight(wallDate) {
  let instant = wallDate
  for (let i = 0; i < 3; i++) instant += wallDate - wallTime(new Date(instant))
  return instant
}

export function forecastDays(now = new Date()) {
  const wall = wallTime(now)
  const midnight = wall - wall % DAY
  return Array.from({ length: 8 }, (_, i) => easternMidnight(midnight + i * DAY))
}

export const ymd = time => new Date(time).toISOString().slice(0, 10).replaceAll('-', '')
export const parseNoaa = value => Date.parse(value.replace(' ', 'T') + 'Z')
export const fmtTime = time => new Date(time).toLocaleTimeString('en-US', {
  timeZone: TZ, hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
})
export const fmtDay = time => new Date(time).toLocaleDateString('en-US', {
  timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric',
})
// Clock time without the zone suffix: the page already says "all times Eastern".
export const fmtClock = time => new Date(time).toLocaleTimeString('en-US', {
  timeZone: TZ, hour: 'numeric', minute: '2-digit',
})
export function fmtTripTime(time, day) {
  if (fmtDay(time) === fmtDay(day)) return fmtClock(time)
  return new Date(time).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }) + ' · ' + fmtClock(time)
}
export const fmtDayChip = time => ({
  weekday: new Date(time).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short' }),
  date: new Date(time).toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }),
})

export function sunTimes(day, lat, lng) {
  const date = new Date(wallTime(new Date(day)))
  const rad = Math.PI / 180
  const noon = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12)
  const n = Math.round(noon / DAY + 2440587.5 - 2451545)
  const j = n - lng / 360
  const m = (357.5291 + 0.98560028 * j) % 360
  const c = 1.9148 * Math.sin(m * rad) + 0.02 * Math.sin(2 * m * rad) + 0.0003 * Math.sin(3 * m * rad)
  const lambda = ((m + c + 180 + 102.9372) % 360) * rad
  const transit = 2451545 + j + 0.0053 * Math.sin(m * rad) - 0.0069 * Math.sin(2 * lambda)
  const dec = Math.asin(Math.sin(lambda) * Math.sin(23.44 * rad))
  const cosine = (Math.sin(-0.833 * rad) - Math.sin(lat * rad) * Math.sin(dec)) / (Math.cos(lat * rad) * Math.cos(dec))
  const w = Math.acos(Math.max(-1, Math.min(1, cosine))) / rad
  return { rise: (transit - w / 360 - 2440587.5) * DAY, set: (transit + w / 360 - 2440587.5) * DAY }
}

export const point = p => ({ lat: p[0], lng: p[1] })
export function km(a, b) {
  const r = Math.PI / 180
  const x = Math.sin((b.lat - a.lat) * r / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(Math.min(1, x)))
}
export function routeMid(pts) {
  const i = Math.floor(pts.length / 2)
  return pts.length % 2 ? point(pts[i]) : {
    lat: (pts[i - 1][0] + pts[i][0]) / 2, lng: (pts[i - 1][1] + pts[i][1]) / 2,
  }
}
export const nearestBy = (list, location) => list.map(s => ({ ...s, d: km(location, s) })).sort((a, b) => a.d - b.d)
export function outTowardInlet(pts) {
  const inlet = nearestBy(INLETS, routeMid(pts))[0]
  return { toward: km(point(pts.at(-1)), inlet) < km(point(pts[0]), inlet), inlet }
}
export function bearing(a, b) {
  const r = Math.PI / 180
  const y = Math.sin((b[1] - a[1]) * r) * Math.cos(b[0] * r)
  const x = Math.cos(a[0] * r) * Math.sin(b[0] * r) - Math.sin(a[0] * r) * Math.cos(b[0] * r) * Math.cos((b[1] - a[1]) * r)
  return (Math.atan2(y, x) / r + 360) % 360
}
export function offsetLine(pts, meters) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]
    const scale = 111320 * Math.cos(p[0] * Math.PI / 180)
    const dx = (b[1] - a[1]) * scale, dy = (b[0] - a[0]) * 111320
    const length = Math.hypot(dx, dy) || 1
    return [p[0] - dx / length * meters / 111320, p[1] + dy / length * meters / scale]
  })
}

export function currentEvents(predictions) {
  return predictions.map(p => {
    const raw = Number(p.Velocity_Major)
    const type = String(p.Type || '').toLowerCase()
    const v = type === 'slack' ? 0 : type === 'ebb' ? -Math.abs(raw) : type === 'flood' ? Math.abs(raw) : raw
    return { t: parseNoaa(p.Time), v }
  }).filter(p => Number.isFinite(p.t) && Number.isFinite(p.v)).sort((a, b) => a.t - b.t)
}
export function tideEvents(tides) {
  const events = []
  tides.forEach((tide, i) => {
    events.push({ t: tide.t, v: 0 })
    if (i < tides.length - 1) events.push({ t: (tide.t + tides[i + 1].t) / 2, v: tide.type === 'L' ? 1 : -1 })
  })
  return events
}
export function valueAt(events, time) {
  const exact = events.find(e => e.t === time)
  if (exact) return exact.v
  const i = events.findIndex(e => e.t > time)
  if (i <= 0) return null
  const a = events[i - 1], b = events[i]
  return a.v + (b.v - a.v) * (1 - Math.cos(Math.PI * (time - a.t) / (b.t - a.t))) / 2
}
export const windAt = (wind, time) => wind.find(w => time >= w.t && time < w.end) || null

export function findTurns(events) {
  const turns = []
  let last = null
  events.forEach((e, i) => {
    if (e.v === 0) return
    if (last && Math.sign(last.v) !== Math.sign(e.v)) {
      const slack = events.slice(last.i + 1, i).find(x => x.v === 0)
      const fraction = Math.acos(1 - 2 * (-last.v / (e.v - last.v))) / Math.PI
      turns.push({ t: slack ? slack.t : last.t + fraction * (e.t - last.t), from: Math.sign(last.v) })
    }
    last = { ...e, i }
  })
  return turns
}

export function computeWindows({ events, wind, route, day, nextDay, duration }) {
  const half = duration * HOUR / 2
  const { toward } = outTowardInlet(route.pts)
  const mid = routeMid(route.pts)
  const sun = sunTimes(day, mid.lat, mid.lng)
  return findTurns(events).filter(turn => turn.from === (toward ? -1 : 1)).map(turn => {
    const window = { launch: turn.t - half, turn: turn.t, back: turn.t + half }
    let peak = 0
    // Do not recommend a trip whose predictions don't cover the whole duration.
    if (valueAt(events, window.launch) == null || valueAt(events, window.back) == null) return null
    for (let t = window.launch; t <= window.back; t += 600_000) peak = Math.max(peak, Math.abs(valueAt(events, t) ?? 0))
    const winds = wind.filter(w => w.end > window.launch && w.t < window.back)
    return {
      ...window, peak, daylight: window.launch >= sun.rise && window.back <= sun.set,
      wind: winds.length ? winds.reduce((a, b) => a.mph > b.mph ? a : b) : null,
    }
  }).filter(w => w && w.launch < nextDay && w.back > day)
}

export function nearbyStations(stations, route) {
  const seen = new Set()
  return nearestBy(stations, routeMid(route.pts)).filter(s => {
    const id = stationKey(s)
    if (seen.has(id)) return false
    seen.add(id)
    return true
  }).slice(0, 6)
}
export const stationKey = station => `${station.id}:${station.bin ?? ''}`

// Which end of a trip falls outside daylight, so the card can say "Dark at launch" instead of a vague "partly dark".
export function darkEnds(trip, sun) {
  const dark = t => t < sun.rise || t > sun.set
  return { launch: dark(trip.launch), back: dark(trip.back) }
}
