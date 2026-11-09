import { fmtTripTime } from '../lib/planner.js'

export default function Windows({ windows, selected, day, approx, onSelect }) {
  if (!windows.length) return <div className="hint">No windows found for this day.</div>
  return windows.map((w, i) => (
    <button type="button" key={w.turn} className={`win${i === selected ? ' sel' : ''}${w.daylight ? '' : ' dark'}`}
      aria-pressed={i === selected} onClick={() => onSelect(i)}>
      <span className="times">
        <span className="pill p-out">🚣 Launch {fmtTripTime(w.launch, day)}</span>→
        <span className="pill p-turn">↩︎ Turn {fmtTripTime(w.turn, day)}</span>→
        <span className="pill p-back">🏁 Back by {fmtTripTime(w.back, day)}</span>
      </span>
      <span className="meta">
        {w.daylight ? '☀️ Daylight' : '🌙 Partly in the dark'}
        {' · '}{approx ? 'relative strength only' : `peak current during trip ${w.peak.toFixed(1)} kn`}
        {w.wind && ` · wind up to ${w.wind.mph} mph ${w.wind.dir}`}
      </span>
    </button>
  ))
}
