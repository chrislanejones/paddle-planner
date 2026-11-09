import { fmtTripTime } from '../lib/planner.js'
import { Moon, Sun, Wind } from './icons.js'

// The slack band: the trip drawn on a 24 hour strip. Out leg and return leg meet at the turn.
function SlackBand({ trip, day, nextDay, sun }) {
  const x = t => Math.max(0, Math.min(100, (t - day) / (nextDay - day) * 100))
  return (
    <svg className="band" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden="true">
      <rect className="c-night" x="0" y="0" width="100" height="14" />
      <rect className="c-day" x={x(sun.rise)} y="0" width={x(sun.set) - x(sun.rise)} height="14" />
      <rect className="c-out" x={x(trip.launch)} y="2" width={x(trip.turn) - x(trip.launch)} height="10" />
      <rect className="c-back" x={x(trip.turn)} y="2" width={x(trip.back) - x(trip.turn)} height="10" />
      <rect className="c-slack" x={x(trip.turn) - 0.4} y="0" width="0.8" height="14" />
    </svg>
  )
}

export default function Windows({ windows, selected, day, nextDay, sun, duration, approx, loading, onSelect }) {
  if (loading) {
    return (
      <div className="win-list" aria-hidden="true">
        <div className="win skeleton" /><div className="win skeleton" />
      </div>
    )
  }
  if (!windows.length) {
    return (
      <p className="empty">
        No trips fit this day. A shorter trip often fits between the turns, or pick another day.
      </p>
    )
  }
  return (
    <div className="win-list">
      {windows.map((w, i) => (
        <button type="button" key={w.turn} className={`win${i === selected ? ' sel' : ''}`}
          aria-pressed={i === selected} onClick={() => onSelect(i)}>
          <span className="win-head">
            <span className="win-range">
              {fmtTripTime(w.launch, day)}<span className="sr"> to </span><span aria-hidden="true"> – </span>{fmtTripTime(w.back, day)}
            </span>
            <span className="win-len">{duration} h trip</span>
          </span>
          <SlackBand trip={w} day={day} nextDay={nextDay} sun={sun} />
          <span className="win-turn">Turn around at <b>{fmtTripTime(w.turn, day)}</b>, slack water</span>
          <span className="chips">
            <span className="chip">
              {w.daylight ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />}
              {w.daylight ? 'Daylight' : 'Partly dark'}
            </span>
            <span className="chip">{approx ? 'Strength: estimate' : `Peak ${w.peak.toFixed(1)} kn`}</span>
            {w.wind && <span className="chip"><Wind size={14} aria-hidden="true" />Up to {w.wind.mph} mph {w.wind.dir}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}
