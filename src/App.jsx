import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Chart from './components/Chart.jsx'
import Readout from './components/Readout.jsx'
import Windows from './components/Windows.jsx'
import MapSettings from './components/MapSettings.jsx'
import { loadCurrentStations } from './lib/api.js'
import { PRESETS, TIDE_STATIONS } from './lib/routes.js'
import { savedRoute, storage } from './lib/storage.js'
import {
  computeWindows, fmtDay, forecastDays, nearbyStations, nearestBy, outTowardInlet, routeMid, stationKey, valueAt,
} from './lib/planner.js'
import { useForecast, useWind } from './hooks/useForecast.js'

const DURATIONS = [1.5, 2, 3, 4, 5]
const TEN_MINUTES = 600_000
const NO_EVENTS = []
const NO_STATION = 'none'
const DRAW_ROUTE = '__draw'
const ENV_ARCGIS_KEY = import.meta.env.VITE_ARCGIS_API_KEY || ''
const resolveArcgisKey = () => String(storage.get('pp_arcgis_key') || ENV_ARCGIS_KEY).trim()

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export default function App() {
  const [days] = useState(() => forecastDays())
  const [openedAt] = useState(() => Date.now())
  const [dayIdx, setDayIdx] = useState(0)
  const [duration, setDuration] = useState(3)
  const [customRoute, setCustomRoute] = useState(savedRoute)
  const [routeId, setRouteId] = useState(PRESETS[0].id)
  const [stations, setStations] = useState([])
  const [stationChoice, setStationChoice] = useState(null) // null = nearest within 15 km
  const [drawing, setDrawing] = useState(false)
  const [drawPoints, setDrawPoints] = useState([])
  const [pickedWindow, setPickedWindow] = useState(null) // null = first daylight window
  const [manualMinutes, setManualMinutes] = useState(null) // null = follow the selected window
  const [revision, setRevision] = useState(0)
  const [arcgisKey, setArcgisKey] = useState(resolveArcgisKey)

  useEffect(() => {
    const controller = new AbortController()
    loadCurrentStations(controller.signal)
      .then(list => { if (!controller.signal.aborted) setStations(list) })
      .catch(() => {}) // without stations the planner falls back to tide-based estimates
    return () => controller.abort()
  }, [])

  const routes = useMemo(() => (customRoute ? [...PRESETS, customRoute] : PRESETS), [customRoute])
  const route = routes.find(r => r.id === routeId) ?? PRESETS[0]
  const mid = useMemo(() => routeMid(route.pts), [route])
  const tideStation = useMemo(() => nearestBy(TIDE_STATIONS, mid)[0], [mid])
  const stationOptions = useMemo(() => nearbyStations(stations, route), [stations, route])
  const station = useMemo(() => {
    if (stationChoice === NO_STATION) return null
    if (stationChoice) return stationOptions.find(s => stationKey(s) === stationChoice) ?? null
    return stationOptions[0]?.d < 15 ? stationOptions[0] : null
  }, [stationChoice, stationOptions])

  const forecast = useForecast(tideStation, station, days, revision)
  const wind = useWind(mid, revision)
  const events = forecast.data?.events ?? NO_EVENTS
  const tides = forecast.data?.tides ?? NO_EVENTS
  const approx = forecast.data?.approx ?? true

  const day = days[dayIdx]
  const nextDay = days[dayIdx + 1]
  const windows = useMemo(() => (forecast.data
    ? computeWindows({ events, wind: wind.data, route, day, nextDay, duration })
    : []), [forecast.data, events, wind.data, route, day, nextDay, duration])
  const selected = pickedWindow !== null && pickedWindow < windows.length
    ? pickedWindow : Math.max(0, windows.findIndex(w => w.daylight))
  const trip = windows[selected]

  const maxMinutes = Math.round((nextDay - day) / 60_000) - 10
  const autoMinutes = trip
    ? Math.round((trip.launch - day) / TEN_MINUTES) * 10
    : dayIdx === 0 ? Math.floor((openedAt - day) / TEN_MINUTES) * 10 : 480
  const minutes = clamp(manualMinutes ?? autoMinutes, 0, maxMinutes)
  const time = day + minutes * 60_000

  const { toward, inlet } = useMemo(() => outTowardInlet(route.pts), [route])
  const stationMarker = useMemo(() => {
    const v = valueAt(events, time)
    const target = approx ? tideStation : station
    if (!forecast.data || !target || v == null) return null
    const slack = Math.abs(v) < 0.15
    return {
      lat: target.lat, lng: target.lng, name: target.name,
      label: approx ? (slack ? 'slack' : v > 0 ? 'flood' : 'ebb') : `${Math.abs(v).toFixed(1)} kn ${v >= 0 ? 'flood' : 'ebb'}`,
      dir: approx ? NaN : v >= 0 ? forecast.data.dirs.flood : forecast.data.dirs.ebb,
    }
  }, [forecast.data, events, time, approx, tideStation, station])

  const resetPicks = () => { setPickedWindow(null); setManualMinutes(null) }
  const chooseRoute = value => {
    if (value === DRAW_ROUTE) { setDrawing(true); setDrawPoints([]); return }
    setRouteId(value)
    setStationChoice(null)
    resetPicks()
  }
  const finishDrawing = () => {
    if (drawPoints.length < 2) return
    const drawn = { id: 'custom', name: 'My route', pts: drawPoints }
    storage.set('pp_custom_route', drawn)
    setCustomRoute(drawn)
    setRouteId('custom')
    setStationChoice(null)
    setDrawing(false)
    resetPicks()
  }

  let status
  if (drawing) {
    status = <div id="status" role="status">Tap the map: first tap = launch spot, last tap = turnaround spot.</div>
  } else if (forecast.status === 'loading') {
    status = <div id="status" role="status">Loading NOAA predictions…</div>
  } else if (forecast.status === 'error') {
    status = (
      <div id="status" role="status">
        NOAA error: {forecast.error}{' '}
        <button type="button" onClick={() => setRevision(r => r + 1)}>Retry</button>
      </div>
    )
  } else {
    const warnings = forecast.data.warnings
    status = (
      <div id="status" role="status" className={!approx && !warnings.length ? 'ok' : ''}>
        {warnings.length
          ? warnings.map(w => <div key={w}>{w}</div>)
          : `${station ? `Currents: ${station.name} (${station.d.toFixed(1)} km away) · ` : ''}Tides: ${tideStation.name}`}
      </div>
    )
  }

  return (
    <>
      <header>
        <h1>🛶 Paddle Tide &amp; Current Planner</h1>
        <span>St. Augustine · NOAA predictions · all times Eastern</span>
      </header>
      <div className="wrap">
        <MapView route={route} window={trip} drawing={drawing} drawPoints={drawPoints}
          onDrawPoint={p => setDrawPoints(points => [...points, p])} stationMarker={stationMarker} arcgisKey={arcgisKey} />
        <section id="panel">
          <div className="controls">
            <label>Day
              <select value={dayIdx} onChange={e => { setDayIdx(+e.target.value); resetPicks() }}>
                {days.slice(0, 7).map((d, i) => (
                  <option key={d} value={i}>{i === 0 ? 'Today · ' : i === 1 ? 'Tomorrow · ' : ''}{fmtDay(d)}</option>
                ))}
              </select>
            </label>
            <label>Trip length (out + back)
              <select value={duration} onChange={e => { setDuration(+e.target.value); resetPicks() }}>
                {DURATIONS.map(h => <option key={h} value={h}>{h} hours</option>)}
              </select>
            </label>
            <label className="full">Route
              <select value={drawing ? DRAW_ROUTE : routeId} onChange={e => chooseRoute(e.target.value)}>
                {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                <option value={DRAW_ROUTE}>✏️ Draw my own route…</option>
              </select>
            </label>
            <label className="full">Current station (nearest NOAA prediction points)
              <select value={stationChoice ?? (station ? stationKey(station) : NO_STATION)}
                onChange={e => { setStationChoice(e.target.value); resetPicks() }}>
                {stationOptions.map(s => <option key={stationKey(s)} value={stationKey(s)}>{s.name}{s.bin != null ? ` (bin ${s.bin})` : ''} — {s.d.toFixed(1)} km</option>)}
                <option value={NO_STATION}>Estimate from tide times only</option>
              </select>
            </label>
          </div>
          {drawing && (
            <div id="drawBar" className="on">
              <button type="button" onClick={() => setDrawPoints(points => points.slice(0, -1))} disabled={!drawPoints.length}>↶ Undo point</button>
              <button type="button" onClick={finishDrawing} disabled={drawPoints.length < 2}>✓ Finish route</button>
              <button type="button" onClick={() => setDrawing(false)}>✕ Cancel</button>
            </div>
          )}
          <div className="hint">
            Out leg heads <b>{toward ? 'toward' : 'away from'}</b> {inlet.name} → ride the <b>{toward ? 'ebb' : 'flood'}</b> out
            and the <b>{toward ? 'flood' : 'ebb'}</b> back. Route lines are approximate; draw your own for an exact path.
          </div>
          {status}

          <h2>Best windows</h2>
          <Windows windows={windows} selected={selected} day={day} approx={approx}
            onSelect={i => { setPickedWindow(i); setManualMinutes(null) }} />

          <h2>Conditions at a time</h2>
          <Readout time={time} route={route} events={events} tides={tides} wind={wind.data} windStatus={wind.status}
            approx={approx} max={maxMinutes} minutes={minutes} onMinutes={setManualMinutes} />
          <Chart day={day} nextDay={nextDay} route={route} events={events} tides={tides} approx={approx}
            window={trip} minutes={minutes} />
          <div className="legend">
            <span><i style={{ background: 'var(--tide)' }} />Tide height</span>
            <span><i style={{ background: 'var(--cur)' }} />Current (above line = flood, below = ebb)</span>
            <span><i style={{ background: 'rgba(34,197,94,.5)' }} />Selected window</span>
            <span><i style={{ background: '#06101a' }} />Night</span>
          </div>
          <div className="legend" style={{ marginTop: 10 }}>
            <span><i style={{ background: 'var(--out)' }} />Out leg</span>
            <span><i style={{ background: 'var(--back)' }} />Return leg (dashed)</span>
          </div>

          <MapSettings hasKey={Boolean(arcgisKey)} onChange={() => setArcgisKey(resolveArcgisKey())} />

          <div className="safety">
            How it works: ebb current flows toward the inlet (out to sea), flood flows away from it. Each window is centered on the
            slack where the current flips, so you ride the tail of one current out and the start of the next one back, while
            currents are at their weakest.<br /><br />
            These are astronomical predictions. Wind, rain runoff and storm surge shift them. Stay out of the St. Augustine and
            Matanzas inlet throats themselves, where the current runs hardest. Check the marine forecast, wear a PFD, and tell
            someone your float plan.
          </div>
        </section>
      </div>
    </>
  )
}
