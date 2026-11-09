import { darkEnds } from '../lib/planner.js'
import Clock from './Clock.jsx'
import { Moon, Sun, Wind } from './icons.js'

const TICKS = [[0, '12a'], [6, '6a'], [12, '12p'], [18, '6p']]

// The slack band: the trip on a 24 hour strip with daylight behind it. Out leg and return leg
// meet at the turn, marked in amber. The same unit is drawn on the chart and on the map.
function SlackBand({ trip, day, nextDay, sun }) {
  const x = t => Math.max(0, Math.min(100, (t - day) / (nextDay - day) * 100))
  return (
    <div className="band-wrap" aria-hidden="true">
      <svg className="band" viewBox="0 0 100 18" preserveAspectRatio="none">
        <rect className="c-night" x="0" y="0" width="100" height="18" />
        <rect className="c-day" x={x(sun.rise)} y="0" width={x(sun.set) - x(sun.rise)} height="18" />
        {TICKS.slice(1).map(([h]) => <rect key={h} className="c-tick" x={h / 24 * 100} y="12" width="0.35" height="6" />)}
        <rect className="c-out" x={x(trip.launch)} y="3" width={x(trip.turn) - x(trip.launch)} height="12" />
        <rect className="c-back" x={x(trip.turn)} y="3" width={x(trip.back) - x(trip.turn)} height="12" />
        <rect className="c-slack" x={x(trip.turn) - 0.45} y="0" width="0.9" height="18" />
      </svg>
      <div className="band-scale">
        {TICKS.map(([h, label]) => <span key={h} style={{ left: `${h / 24 * 100}%` }}>{label}</span>)}
      </div>
    </div>
  )
}

function darkNote(trip, sun) {
  const dark = darkEnds(trip, sun)
  if (dark.launch && dark.back) return 'Dark the whole trip'
  if (dark.launch) return 'Dark at launch'
  if (dark.back) return 'Dark at return'
  return null
}

export default function Windows({ windows, selected, day, nextDay, sun, duration, approx, loading, tidal = true, onSelect }) {
  if (loading) {
    return (
      <div className="win-list" aria-hidden="true">
        <div className="win skeleton" /><div className="win skeleton" />
      </div>
    )
  }
  if (!windows.length) {
    return <p className="empty">No {duration} hour trip fits this day. Try a shorter trip or another day.</p>
  }
  return (
    <div className="win-list">
      {windows.map((w, i) => {
        const dark = darkNote(w, sun)
        return (
          <button type="button" key={w.turn} className={`win${i === selected ? ' sel' : ''}`}
            aria-pressed={i === selected} onClick={() => onSelect(i)}>
            <span className="win-head">
              <span className="win-range">
                <Clock time={w.launch} day={day} /><span className="sr"> to </span><span className="win-dash" aria-hidden="true">to</span><Clock time={w.back} day={day} />
              </span>
              <span className="win-len">{duration} hr</span>
            </span>
            <SlackBand trip={w} day={day} nextDay={nextDay} sun={sun} />
            <span className="win-turn">Turn <b><Clock time={w.turn} day={day} /></b> {tidal ? 'at slack' : 'at the halfway point'}</span>
            <span className="chips">
              <span className={`chip ${dark ? 'chip-dark' : ''}`}>
                {dark ? <Moon size={14} aria-hidden="true" /> : <Sun size={14} aria-hidden="true" />}
                {dark ?? 'Daylight'}
              </span>
              {tidal && <span className="chip">{approx ? 'Strength: estimate' : `Peak ${w.peak.toFixed(1)} kn`}</span>}
              {w.wind && <span className="chip"><Wind size={14} aria-hidden="true" />Wind to {w.wind.mph} mph {w.wind.dir}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
