import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import Chart from './components/Chart.jsx'
import Readout from './components/Readout.jsx'
import Windows from './components/Windows.jsx'
import ChipGroup from './components/ChipGroup.jsx'
import MapSettings from './components/MapSettings.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import { ArrowCounterClockwise, Check, CheckCircle, Info, PencilSimple, TrashSimple, Warning, WarningOctagon, Waves, X } from './components/icons.js'
import { loadCurrentStations } from './lib/api.js'
import { PRESETS, TIDE_STATIONS } from './lib/routes.js'
import { savedRoute, storage } from './lib/storage.js'
import {
  computeWindows, fmtDay, fmtDayChip, forecastDays, nearbyStations, nearestBy, outTowardInlet, routeMid, stationKey, sunTimes, valueAt,
} from './lib/planner.js'
import { useForecast, useWind } from './hooks/useForecast.js'

const DURATIONS = [1.5, 2, 3, 4, 5]
const TEN_MINUTES = 600_000
const NO_EVENTS = []
const NO_STATION = 'none'
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
  const [cleared, setCleared] = useState(false) // true = no route on the map
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
  const sun = useMemo(() => sunTimes(day, mid.lat, mid.lng), [day, mid])
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
    if (cleared) return null
    const v = valueAt(events, time)
    const target = approx ? tideStation : station
    if (!forecast.data || !target || v == null) return null
    const slack = Math.abs(v) < 0.15
    return {
      lat: target.lat, lng: target.lng, name: target.name,
      label: approx ? (slack ? 'slack' : v > 0 ? 'flood' : 'ebb') : `${Math.abs(v).toFixed(1)} kn ${v >= 0 ? 'flood' : 'ebb'}`,
      dir: approx ? NaN : v >= 0 ? forecast.data.dirs.flood : forecast.data.dirs.ebb,
    }
  }, [cleared, forecast.data, events, time, approx, tideStation, station])

  const resetPicks = () => { setPickedWindow(null); setManualMinutes(null) }
  const chooseRoute = value => {
    setDrawing(false)
    setCleared(false)
    setRouteId(value)
    setStationChoice(null)
    resetPicks()
  }
  const startDrawing = () => { setDrawPoints([]); setDrawing(true) }
  const finishDrawing = () => {
    if (drawPoints.length < 2) return
    const drawn = { id: 'custom', name: 'My route', pts: drawPoints }
    storage.set('pp_custom_route', drawn)
    setCustomRoute(drawn)
    setCleared(false)
    setRouteId('custom')
    setStationChoice(null)
    setDrawing(false)
    resetPicks()
  }

  // Clears whatever route is on the map. A drawn route is also deleted from this browser; a preset just hides.
  const clearRoute = () => {
    if (routeId === 'custom') {
      storage.remove('pp_custom_route')
      setCustomRoute(null)
      setRouteId(PRESETS[0].id)
    }
    setStationChoice(null)
    setCleared(true)
    resetPicks()
  }

  // Status uses an icon plus a tinted field (never a colored side stripe), so state never relies on color alone.
  let status
  if (drawing) {
    status = <div className="status info" role="status"><Info size={20} aria-hidden="true" /><p>Tap the map to place the launch, then each bend. The last tap is the turn.</p></div>
  } else if (forecast.status === 'loading') {
    status = <div className="status info" role="status"><Info size={20} aria-hidden="true" /><p>Loading NOAA tide and current predictions…</p></div>
  } else if (forecast.status === 'error') {
    status = (
      <div className="status error" role="alert">
        <WarningOctagon size={20} aria-hidden="true" />
        <p><b>Predictions didn't load.</b> {forecast.error}</p>
        <button type="button" onClick={() => setRevision(r => r + 1)}><ArrowCounterClockwise size={16} aria-hidden="true" />Retry</button>
      </div>
    )
  } else {
    const warnings = forecast.data.warnings
    status = warnings.length
      ? <div className="status warn" role="status"><Warning size={20} aria-hidden="true" /><div>{warnings.map(w => <p key={w}>{w}</p>)}</div></div>
      : (
        <div className="status ok" role="status">
          <CheckCircle size={20} aria-hidden="true" />
          <p>{station ? `Current: ${station.name}, ${station.d.toFixed(1)} km away · ` : ''}Tide: {tideStation.name}</p>
        </div>
      )
  }

  const monthNote = [...new Set(days.slice(0, 7).map(d => fmtDayChip(d).date.split(' ')[0]))].join(' / ')
  const stationLabel = station ? station.name : 'estimated from tides'

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <Waves size={28} aria-hidden="true" />
          <div>
            <h1>Paddle Tide &amp; Current Planner</h1>
            <p>St. Augustine, FL · NOAA predictions · Eastern time</p>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <div className="wrap">
        <MapView route={route} visible={!cleared} window={trip} drawing={drawing} drawPoints={drawPoints}
          onDrawPoint={p => setDrawPoints(points => [...points, p])} stationMarker={stationMarker} arcgisKey={arcgisKey} />
        <section id="panel" aria-label="Trip planner">
          <ChipGroup label="Day" note={monthNote} value={dayIdx} className="days"
            options={days.slice(0, 7).map((d, i) => {
              const { weekday, date } = fmtDayChip(d)
              return { value: i, top: i === 0 ? 'Today' : weekday, main: date.split(' ')[1], name: fmtDay(d) }
            })}
            onChange={i => { setDayIdx(i); resetPicks() }} />
          <ChipGroup label="Round trip" value={duration} className="lengths"
            options={DURATIONS.map(h => ({ value: h, main: String(h), unit: 'hr', name: `${h} hours` }))}
            onChange={h => { setDuration(h); resetPicks() }} />
          <div className="field">
            <label className="field-label" htmlFor="route">Route</label>
            <select id="route" value={cleared ? '' : routeId} onChange={e => chooseRoute(e.target.value)}>
              {cleared && <option value="" disabled>Choose a route…</option>}
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {drawing && (
            <div className="draw-bar">
              <button type="button" onClick={() => setDrawPoints(points => points.slice(0, -1))} disabled={!drawPoints.length}><ArrowCounterClockwise size={18} aria-hidden="true" />Undo point</button>
              <button type="button" onClick={() => setDrawPoints([])} disabled={!drawPoints.length}><TrashSimple size={18} aria-hidden="true" />Clear route</button>
              <button type="button" className="primary" onClick={finishDrawing} disabled={drawPoints.length < 2}><Check size={18} aria-hidden="true" />Finish route</button>
              <button type="button" onClick={() => setDrawing(false)}><X size={18} aria-hidden="true" />Cancel</button>
            </div>
          )}
          {!drawing && (
            <div className="draw-bar">
              <button type="button" onClick={startDrawing}><PencilSimple size={18} aria-hidden="true" />Draw my own route</button>
              {!cleared && <button type="button" onClick={clearRoute}><TrashSimple size={18} aria-hidden="true" />Clear route</button>}
            </div>
          )}
          {cleared ? (
            <p className="empty">No route on the map. Pick one above, or draw your own.</p>
          ) : (
            <>
            <p className="hint">
              Out leg runs <b>{toward ? 'toward' : 'away from'}</b> {inlet.name}: paddle out on the <b>{toward ? 'ebb' : 'flood'}</b>,
              return on the <b>{toward ? 'flood' : 'ebb'}</b>. Lines are approximate. Draw your own for an exact path.
            </p>
            <details className="advanced">
              <summary>Current source: {stationLabel}</summary>
              <div className="field">
                <label className="field-label" htmlFor="station">Current station</label>
                <select id="station" value={stationChoice ?? (station ? stationKey(station) : NO_STATION)}
                  onChange={e => { setStationChoice(e.target.value); resetPicks() }}>
                  {stationOptions.map(s => <option key={stationKey(s)} value={stationKey(s)}>{s.name}{s.bin != null ? ` (bin ${s.bin})` : ''} — {s.d.toFixed(1)} km</option>)}
                  <option value={NO_STATION}>Estimate from tides only</option>
                </select>
              </div>
            </details>
            {status}

            <h2>Launch windows</h2>
            <Windows windows={windows} selected={selected} day={day} nextDay={nextDay} sun={sun} duration={duration} approx={approx}
              loading={forecast.status === 'loading' && !drawing}
              onSelect={i => { setPickedWindow(i); setManualMinutes(null) }} />

            <h2>Conditions</h2>
            <Readout time={time} route={route} events={events} tides={tides} wind={wind.data} windStatus={wind.status}
              approx={approx} max={maxMinutes} minutes={minutes} onMinutes={setManualMinutes} />
            <Chart day={day} nextDay={nextDay} sun={sun} events={events} tides={tides} approx={approx}
              window={trip} minutes={minutes} max={maxMinutes} now={openedAt} onMinutes={setManualMinutes} />
            <ul className="legend" aria-label="Chart legend">
              <li><i className="sw sw-tide" />Tide height</li>
              <li><i className="sw sw-current" />Current (above line = flood, below = ebb)</li>
              <li><i className="sw sw-out" />Out leg</li>
              <li><i className="sw sw-back" />Return leg</li>
              <li><i className="sw sw-slack" />Turn at slack water</li>
              <li><i className="sw sw-night" />Night</li>
            </ul>
            </>
          )}

          <MapSettings hasKey={Boolean(arcgisKey)} onChange={() => setArcgisKey(resolveArcgisKey())} />

          <aside className="safety" aria-label="Safety notes">
            <h2>Safety</h2>
            <ul>
              <li><b>Wear a PFD, check the marine forecast, and leave a float plan.</b></li>
              <li>Stay out of the inlet throats, where current runs hardest. Dashed rings on the map mark them.</li>
              <li>Predictions are astronomical. Wind, rain runoff and storm surge shift them.</li>
            </ul>
            <p>Each window centers on the slack where the current flips: ride the tail of one current out and the start of the next one back.</p>
          </aside>
        </section>
      </div>
    </>
  )
}
