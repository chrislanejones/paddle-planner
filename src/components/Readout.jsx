import { fmtClock, fmtDay, outTowardInlet, valueAt, windAt } from '../lib/planner.js'
import Clock from './Clock.jsx'
import { ArrowDownLeft, ArrowUpRight, Equals } from './icons.js'

const TEN_MINUTES = 600_000

export default function Readout({ time, route, events, tides, wind, windStatus, approx, max, minutes, onMinutes }) {
  const v = valueAt(events, time)
  const height = valueAt(tides, time)
  const before = valueAt(tides, time - TEN_MINUTES)
  const forecast = windAt(wind, time)
  const { toward } = outTowardInlet(route.pts, route.inlet)
  const slack = Math.abs(v ?? 0) < (approx ? 0.15 : 0.2)

  let current = 'No data'
  if (v != null) {
    const kind = slack ? 'Slack' : v > 0 ? 'Flood, away from inlet' : 'Ebb, toward inlet'
    current = approx
      ? `${kind} · ${Math.round(Math.abs(v) * 100)}% of max`
      : `${Math.abs(v).toFixed(1)} kn · ${kind}`
  }
  const tide = height != null
    ? `${height.toFixed(1)} ft · ${before == null || height >= before ? 'rising' : 'falling'}`
    : 'No data'
  const windText = forecast
    ? `${forecast.mph} mph ${forecast.dir} · ${forecast.sky}`
    : wind.length ? 'Past the NWS hourly forecast'
      : windStatus === 'loading' ? 'Loading' : 'Not available'

  let leg = null
  if (v != null && !slack) {
    const helpsOut = toward ? v < 0 : v > 0
    leg = helpsOut
      ? { kind: 'out', Icon: ArrowUpRight, text: <>Current assists the <b>out leg</b></> }
      : { kind: 'back', Icon: ArrowDownLeft, text: <>Current assists the <b>return</b></> }
  } else if (v != null) {
    leg = { kind: 'slack', Icon: Equals, text: <>Slack. Easy both ways</> }
  }

  return (
    <div className="readout">
      <div className="ro-time"><span className="ro-day">{fmtDay(time)}</span><Clock time={time} /></div>
      <dl className="ro-grid">
        <dt>Current</dt><dd>{current}</dd>
        <dt>Tide</dt><dd>{tide}</dd>
        <dt>Wind</dt><dd>{windText}</dd>
      </dl>
      {leg && <div className={`ro-leg ro-${leg.kind}`}><leg.Icon size={18} aria-hidden="true" />{leg.text}</div>}
      <input type="range" min="0" max={max} step="10" value={minutes} aria-label="Time of day"
        aria-valuetext={`${fmtDay(time)}, ${fmtClock(time)}`}
        onChange={e => onMinutes(+e.target.value)} />
    </div>
  )
}
