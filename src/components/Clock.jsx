import { fmtTripTime } from '../lib/planner.js'

// "6:03 AM" set as large tabular digits with a small AM/PM unit, the way a tide table sets its columns.
// Pass `day` when the time can fall on another date; the date then leads ("Nov 9 · 12:30 AM").
export default function Clock({ time, day }) {
  const text = fmtTripTime(time, day ?? time)
  const split = text.lastIndexOf(' ')
  return (
    <span className="clock">
      <span className="clock-digits">{text.slice(0, split)}</span>
      <span className="clock-unit">{text.slice(split + 1)}</span>
    </span>
  )
}
