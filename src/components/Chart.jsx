import { useEffect, useMemo, useRef, useState } from 'react'
import { routeMid, sunTimes, valueAt } from '../lib/planner.js'

const HEIGHT = 176
const PLOT_BOTTOM = 154
const STEP = 10 * 60_000
const hourLabel = h => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`)

// Draw in real pixels so labels stay readable on phones instead of scaling with a fixed viewBox.
function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(600)
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.round(entry.contentRect.width))))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

export default function Chart({ day, nextDay, route, events, tides, approx, window: trip, minutes, max, now, onMinutes }) {
  const [ref, W] = useWidth()
  const span = nextDay - day
  const x = t => (t - day) / span * W
  const shapes = useMemo(() => {
    const mid = routeMid(route.pts)
    const sun = sunTimes(day, mid.lat, mid.lng)
    const tidePts = [], currentPts = []
    let hMin = Infinity, hMax = -Infinity, vMax = 0
    for (let t = day; t <= nextDay; t += STEP) {
      const h = valueAt(tides, t), v = valueAt(events, t)
      if (h != null) { tidePts.push([t, h]); hMin = Math.min(hMin, h); hMax = Math.max(hMax, h) }
      if (v != null) { currentPts.push([t, v]); vMax = Math.max(vMax, Math.abs(v)) }
    }
    return { sun, tidePts, currentPts, hMin, hMax, vMax }
  }, [route, day, nextDay, events, tides])

  const { sun, tidePts, currentPts, hMin, hMax, vMax } = shapes
  const yTide = h => 140 - (h - hMin) / ((hMax - hMin) || 1) * 100
  const yCurrent = v => 78 - v / (vMax || 1) * 52
  const cursorX = minutes * 60_000 / span * W
  const hours = Math.round(span / 3_600_000)

  const scrub = e => {
    const rect = e.currentTarget.getBoundingClientRect()
    const m = Math.round((e.clientX - rect.left) / rect.width * span / 60_000 / 10) * 10
    onMinutes(Math.max(0, Math.min(max, m)))
  }

  return (
    <div className="chart-wrap" ref={ref}>
      <svg id="chart" width={W} height={HEIGHT} role="img" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e) }}
        onPointerMove={e => { if (e.buttons) scrub(e) }}
        aria-label="Tide height and current speed across the selected day. Drag to change the time.">
        <rect x="0" y="0" width={Math.max(0, x(sun.rise))} height={PLOT_BOTTOM} fill="#06101a" />
        <rect x={x(sun.set)} y="0" width={Math.max(0, W - x(sun.set))} height={PLOT_BOTTOM} fill="#06101a" />
        {trip && <>
          <rect x={x(trip.launch)} y="0" width={x(trip.back) - x(trip.launch)} height={PLOT_BOTTOM} fill="rgba(34,197,94,.18)" />
          <line x1={x(trip.turn)} x2={x(trip.turn)} y1="0" y2={PLOT_BOTTOM} stroke="#f59e0b" strokeDasharray="3 3" />
        </>}
        {Array.from({ length: Math.floor(hours / 3) + 1 }, (_, i) => i * 3).map(h => (
          <g key={h}>
            <line x1={h / hours * W} x2={h / hours * W} y1="0" y2={PLOT_BOTTOM} stroke="#35566e" strokeWidth=".6" />
            {h < hours && <text x={h / hours * W + 3} y={HEIGHT - 6} fill="#9bbbcf" fontSize="11">{hourLabel(h)}</text>}
          </g>
        ))}
        {tidePts.length > 0 && <>
          <path d={`M${tidePts.map(p => `${x(p[0])},${yTide(p[1])}`).join('L')}L${W},${PLOT_BOTTOM}L0,${PLOT_BOTTOM}Z`}
            fill="rgba(59,130,246,.22)" stroke="#60a5fa" strokeWidth="2" />
          <text x={W - 4} y="16" textAnchor="end" fill="#93c5fd" fontSize="11">High {hMax.toFixed(1)} ft</text>
          <text x={W - 4} y={PLOT_BOTTOM - 6} textAnchor="end" fill="#93c5fd" fontSize="11">Low {hMin.toFixed(1)} ft</text>
        </>}
        {currentPts.length > 0 && <>
          <line x1="0" x2={W} y1="78" y2="78" stroke="#fb923c" strokeOpacity=".4" strokeDasharray="2 4" />
          <path d={`M${currentPts.map(p => `${x(p[0])},${yCurrent(p[1])}`).join('L')}`} fill="none" stroke="#fb923c" strokeWidth="2" />
          {!approx && <text x="4" y="16" fill="#fdba74" fontSize="11">±{vMax.toFixed(1)} kn</text>}
        </>}
        {now >= day && now < nextDay && (
          <g aria-hidden="true">
            <line x1={x(now)} x2={x(now)} y1="0" y2={PLOT_BOTTOM} stroke="#9bbbcf" strokeDasharray="1 3" />
            <text x={x(now) + 3} y="30" fill="#9bbbcf" fontSize="10">now</text>
          </g>
        )}
        <line x1={cursorX} x2={cursorX} y1="0" y2={PLOT_BOTTOM} stroke="#fff" strokeWidth="1.5" />
        <circle cx={cursorX} cy={PLOT_BOTTOM} r="4" fill="#fff" />
      </svg>
    </div>
  )
}
