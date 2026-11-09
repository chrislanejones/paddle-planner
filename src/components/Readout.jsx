import { fmtDay, fmtTime, outTowardInlet, valueAt, windAt } from '../lib/planner.js'

const TEN_MINUTES = 600_000

export default function Readout({ time, route, events, tides, wind, windStatus, approx, max, minutes, onMinutes }) {
  const v = valueAt(events, time)
  const height = valueAt(tides, time)
  const before = valueAt(tides, time - TEN_MINUTES)
  const forecast = windAt(wind, time)
  const { toward } = outTowardInlet(route.pts)
  const slack = Math.abs(v ?? 0) < (approx ? 0.15 : 0.2)

  let current = 'Current: no data'
  if (v != null) {
    const kind = slack ? 'near slack' : v > 0 ? 'flooding (away from inlet)' : 'ebbing (toward inlet)'
    current = approx
      ? `Current: ${kind} — ${Math.round(Math.abs(v) * 100)}% of max (estimate)`
      : `Current: ${Math.abs(v).toFixed(1)} kn, ${kind}`
  }
  const tide = height != null
    ? `Tide: ${height.toFixed(1)} ft MLLW, ${before == null || height >= before ? 'rising' : 'falling'}`
    : 'Tide: no data'
  const windText = forecast
    ? `Wind: ${forecast.mph} mph ${forecast.dir} · ${forecast.sky}`
    : wind.length ? 'Wind: beyond NWS hourly forecast'
      : windStatus === 'loading' ? 'Wind: loading…' : 'Wind: unavailable'

  let leg = null
  if (v != null && !slack) {
    const helpsOut = toward ? v < 0 : v > 0
    leg = helpsOut
      ? <>🟢 Current is pushing you along the <b>out</b> leg</>
      : <>🔵 Current is pushing you along the <b>return</b> leg</>
  } else if (v != null) {
    leg = '⚪ Slack water — easy both ways'
  }

  return (
    <div className="readout">
      <div className="big">{fmtDay(time)} · {fmtTime(time)}</div>
      <div>{current}</div>
      <div>{tide}</div>
      <div>{windText}</div>
      <div style={{ marginTop: 4 }}>{leg}</div>
      <input type="range" min="0" max={max} step="10" value={minutes} aria-label="Time of day"
        onChange={e => onMinutes(+e.target.value)} />
    </div>
  )
}
