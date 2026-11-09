import { useEffect, useMemo, useRef, useState } from 'react'
import { valueAt } from '../lib/planner.js'

const HEIGHT = 184
const PLOT_BOTTOM = 160
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

export default function Chart({ day, nextDay, sun, events, tides, approx, window: trip, minutes, max, now, onMinutes }) {
  const [ref, W] = useWidth()
  const span = nextDay - day
  const x = t => (t - day) / span * W
  const shapes = useMemo(() => {
    const tidePts = [], currentPts = []
    let hMin = Infinity, hMax = -Infinity, vMax = 0
    for (let t = day; t <= nextDay; t += STEP) {
      const h = valueAt(tides, t), v = valueAt(events, t)
      if (h != null) { tidePts.push([t, h]); hMin = Math.min(hMin, h); hMax = Math.max(hMax, h) }
      if (v != null) { currentPts.push([t, v]); vMax = Math.max(vMax, Math.abs(v)) }
    }
    return { tidePts, currentPts, hMin, hMax, vMax }
  }, [day, nextDay, events, tides])

  const { tidePts, currentPts, hMin, hMax, vMax } = shapes
  const yTide = h => 146 - (h - hMin) / ((hMax - hMin) || 1) * 100
  const yCurrent = v => 84 - v / (vMax || 1) * 54
  const cursorX = minutes * 60_000 / span * W
  const hours = Math.round(span / 3_600_000)

  const scrub = e => {
    const rect = e.currentTarget.getBoundingClientRect()
    const m = Math.round((e.clientX - rect.left) / rect.width * span / 60_000 / 10) * 10
    onMinutes(Math.max(0, Math.min(max, m)))
  }

  return (
    <div className="chart-wrap" ref={ref}>
      <svg id="chart" width={W} height={HEIGHT} role="img"
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); scrub(e) }}
        onPointerMove={e => { if (e.buttons) scrub(e) }}
        aria-label="Tide height and current speed across the selected day. Drag to change the time.">
        <rect className="c-night" x="0" y="0" width={Math.max(0, x(sun.rise))} height={PLOT_BOTTOM} />
        <rect className="c-night" x={x(sun.set)} y="0" width={Math.max(0, W - x(sun.set))} height={PLOT_BOTTOM} />
        {trip && <>
          <rect className="c-out-tint" x={x(trip.launch)} y="0" width={x(trip.turn) - x(trip.launch)} height={PLOT_BOTTOM} />
          <rect className="c-back-tint" x={x(trip.turn)} y="0" width={x(trip.back) - x(trip.turn)} height={PLOT_BOTTOM} />
          <rect className="c-out" x={x(trip.launch)} y={PLOT_BOTTOM} width={x(trip.turn) - x(trip.launch)} height="6" />
          <rect className="c-back" x={x(trip.turn)} y={PLOT_BOTTOM} width={x(trip.back) - x(trip.turn)} height="6" />
          <line className="c-slack-line" x1={x(trip.turn)} x2={x(trip.turn)} y1="0" y2={PLOT_BOTTOM + 6} />
        </>}
        {Array.from({ length: Math.floor(hours / 3) + 1 }, (_, i) => i * 3).map(h => (
          <g key={h}>
            <line className="c-grid" x1={h / hours * W} x2={h / hours * W} y1="0" y2={PLOT_BOTTOM} />
            {h < hours && <text className="c-label" x={h / hours * W + 3} y={HEIGHT - 6}>{hourLabel(h)}</text>}
          </g>
        ))}
        {tidePts.length > 0 && <>
          <path className="c-tide-fill" d={`M${tidePts.map(p => `${x(p[0])},${yTide(p[1])}`).join('L')}L${W},${PLOT_BOTTOM}L0,${PLOT_BOTTOM}Z`} />
          <path className="c-tide" d={`M${tidePts.map(p => `${x(p[0])},${yTide(p[1])}`).join('L')}`} />
          <text className="c-label c-tide-label" x={W - 4} y="16" textAnchor="end">High {hMax.toFixed(1)} ft</text>
          <text className="c-label c-tide-label" x={W - 4} y={PLOT_BOTTOM - 6} textAnchor="end">Low {hMin.toFixed(1)} ft</text>
        </>}
        {currentPts.length > 0 && <>
          <line className="c-zero" x1="0" x2={W} y1="84" y2="84" />
          <path className="c-current" d={`M${currentPts.map(p => `${x(p[0])},${yCurrent(p[1])}`).join('L')}`} />
          {!approx && <text className="c-label c-current-label" x="4" y="16">±{vMax.toFixed(1)} kn</text>}
        </>}
        {now >= day && now < nextDay && (
          <g aria-hidden="true">
            <line className="c-now" x1={x(now)} x2={x(now)} y1="0" y2={PLOT_BOTTOM} />
            <text className="c-label" x={x(now) + 3} y="32">now</text>
          </g>
        )}
        <line className="c-cursor" x1={cursorX} x2={cursorX} y1="0" y2={PLOT_BOTTOM + 6} />
        <circle className="c-cursor-dot" cx={cursorX} cy={PLOT_BOTTOM + 3} r="5" />
      </svg>
    </div>
  )
}
