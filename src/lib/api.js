import { DAY, HOUR, currentEvents, parseNoaa, tideEvents, ymd } from './planner.js'
import { storage } from './storage.js'

const API = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter'
const METADATA = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json?type=currentpredictions'
const predictionCache = new Map()
const observedCache = new Map()

export async function getJSON(url, signal, attempts = 2) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    signal?.throwIfAborted()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`Data service returned HTTP ${response.status}.`)
      const data = await response.json()
      if (data.error) throw new Error(data.error.message || 'The data service returned an error.')
      return data
    } catch (error) {
      signal?.throwIfAborted()
      const networkError = error.name === 'TypeError' || error.name === 'AbortError'
      if (networkError && attempt < attempts - 1) continue
      if (networkError) throw new Error('Could not reach the data service. Check your connection, then retry. Your browser or network may be blocking the request.', { cause: error })
      throw error
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  }
}

export async function loadCurrentStations(signal) {
  const cached = storage.get('pp_cstations_v1')
  if (cached && Date.now() - cached.t < 30 * DAY && Array.isArray(cached.s) && cached.s.length) return cached.s
  const data = await getJSON(METADATA, signal)
  const stations = (data.stations || []).map(s => ({
    id: s.id, name: s.name, lat: +s.lat, lng: +s.lng, bin: s.currbin ?? s.bin ?? null,
  })).filter(s => s.lat > 28.5 && s.lat < 31.5 && s.lng > -82.5 && s.lng < -80)
  storage.set('pp_cstations_v1', { t: Date.now(), s: stations })
  return stations
}

function predictionUrl(product, station, days, extra = {}) {
  return `${API}?${new URLSearchParams({
    product, application: 'paddle_planner', station,
    begin_date: ymd(days[0] - DAY), end_date: ymd(days[7] + DAY),
    units: 'english', time_zone: 'gmt', format: 'json', ...extra,
  })}`
}

export async function loadPredictions({ tideStation, station, days, signal, refresh = false }) {
  const key = `${tideStation.id}|${station?.id}:${station?.bin}|${days[0]}`
  const cached = predictionCache.get(key)
  if (!refresh && cached && Date.now() - cached.at < HOUR) return cached.data
  const tideRequest = getJSON(predictionUrl('predictions', tideStation.id, days, { datum: 'MLLW', interval: 'hilo' }), signal)
  const currentRequest = async () => {
    if (!station) return null
    const extra = { interval: 'MAX_SLACK' }
    if (station.bin != null) extra.bin = station.bin
    return getJSON(predictionUrl('currents_predictions', station.id, days, extra), signal)
  }
  // Partial service outages must not discard the other service's usable data.
  const [tideResult, currentResult] = await Promise.allSettled([tideRequest, currentRequest()])
  signal?.throwIfAborted()
  const tides = tideResult.status === 'fulfilled' ? (tideResult.value.predictions || []).map(p => ({
    t: parseNoaa(p.t), v: +p.v, type: p.type,
  })).filter(p => Number.isFinite(p.t) && Number.isFinite(p.v)).sort((a, b) => a.t - b.t) : []
  const predictions = currentResult.status === 'fulfilled' ? currentResult.value?.current_predictions?.cp || [] : []
  const currents = currentEvents(predictions)
  const approx = currents.length < 2
  const events = approx ? tideEvents(tides) : currents
  if (events.length < 2) {
    throw new Error(tideResult.reason?.message || currentResult.reason?.message || 'No predictions were returned for this week.')
  }
  const warnings = []
  const OFF = 'which can run 30 to 90 minutes off in the rivers.'
  if (approx) {
    warnings.push(station
      ? `The current station didn't respond. Slack is estimated from tide turns at ${tideStation.name}, ${OFF}`
      : `No current station near this route. Slack is estimated from tide turns at ${tideStation.name}, ${OFF}`)
  } else if (station.d >= 15) {
    warnings.push(`The nearest current station is ${Math.round(station.d)} km away and may be in a different waterway. Its timing may not match your route.`)
  }
  if (!tides.length) warnings.push('Tide heights are unavailable. Current predictions are still shown.')
  const data = {
    tides, events, approx, warnings,
    dirs: { flood: Number(predictions[0]?.meanFloodDir), ebb: Number(predictions[0]?.meanEbbDir) },
  }
  // Retry transient partial failures on the next request instead of retaining them.
  if (tides.length && (!station || !approx)) predictionCache.set(key, { at: Date.now(), data })
  return data
}

export async function loadWind(mid, signal, refresh = false) {
  const key = `pp_wind_v2_${mid.lat.toFixed(2)},${mid.lng.toFixed(2)}`
  const cached = storage.get(key)
  if (!refresh && cached && Date.now() - cached.t < 2 * HOUR && Array.isArray(cached.w)) return cached.w
  const point = await getJSON(`https://api.weather.gov/points/${mid.lat.toFixed(4)},${mid.lng.toFixed(4)}`, signal)
  if (!point.properties?.forecastHourly) throw new Error('No hourly forecast is available for this route.')
  const forecast = await getJSON(point.properties.forecastHourly, signal)
  const wind = (forecast.properties?.periods || []).map(p => ({
    t: Date.parse(p.startTime), end: Date.parse(p.endTime),
    mph: Math.max(...(p.windSpeed.match(/\d+/g) || [0]).map(Number)),
    dir: p.windDirection, sky: p.shortForecast,
  }))
  storage.set(key, { t: Date.now(), w: wind })
  return wind
}

// Live water level at a gauge for the last three hours, in feet above MLLW, the same datum as the predictions.
export async function loadObserved(gauge, signal) {
  const cached = observedCache.get(gauge.id)
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.data
  const url = `${API}?${new URLSearchParams({
    product: 'water_level', application: 'paddle_planner', station: gauge.id, range: '3',
    datum: 'MLLW', units: 'english', time_zone: 'gmt', format: 'json',
  })}`
  const data = await getJSON(url, signal)
  const readings = (data.data || []).map(r => ({ t: parseNoaa(r.t), v: +r.v }))
    .filter(r => Number.isFinite(r.t) && Number.isFinite(r.v)).sort((a, b) => a.t - b.t)
  observedCache.set(gauge.id, { at: Date.now(), data: readings })
  return readings
}
