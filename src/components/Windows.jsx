import { fmtTripTime } from '../lib/planner.js'

export default function Windows({ windows, selected, day, duration, approx, onSelect }) {
  if (!windows.length) return <p className="empty">No windows found for this day. Try another day or a shorter trip.</p>
  return (
    <div className="win-list">
      {windows.map((w, i) => (
        <button type="button" key={w.turn} className={`win${i === selected ? ' sel' : ''}`}
          aria-pressed={i === selected} onClick={() => onSelect(i)}>
          <span className="win-head">
            <span className="win-range">
              {fmtTripTime(w.launch, day)}<span className="sr"> to </span><span aria-hidden="true"> → </span>{fmtTripTime(w.back, day)}
            </span>
            <span className="win-len">{duration} h trip</span>
          </span>
          <span className="win-turn">Turn around at <b>{fmtTripTime(w.turn, day)}</b> · slack water</span>
          <span className="chips">
            <span className={`chip ${w.daylight ? 'chip-ok' : 'chip-warn'}`}>{w.daylight ? '☀️ Daylight' : '🌙 Partly dark'}</span>
            <span className="chip">{approx ? 'Strength: estimate' : `Peak ${w.peak.toFixed(1)} kn`}</span>
            {w.wind && <span className="chip">Wind to {w.wind.mph} mph {w.wind.dir}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
