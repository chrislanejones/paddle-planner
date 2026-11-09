import { useMemo } from 'react'
import { routeMid, sunTimes, valueAt } from '../lib/planner.js'

const W = 600
const HEIGHT = 160
const STEP = 10 * 60_000
const hourLabel = h => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`)

export default function Chart({ day, nextDay, route, events, tides, approx, window: trip, minutes }) {
  const span = nextDay - day
  const x = t => (t - day) / span * W
  const shapes = useMemo(() => {
    const mid = routeMid(route.pts)
    const sun = sunTimes(day, mid.lat, mid.lng)
    const tidePts = [], currentPts = []
    let hMin = Infinity, hMax = -Infinity, vMax = 0
    for (let t = day; t <= nextDay; t += STEP) {
      const h = valueAt(tides, t), v = valueAt(events, t)
      const px = (t - day) / span * W
      if (h != null) { tidePts.push([px, h]); hMin = Math.min(hMin, h); hMax = Math.max(hMax, h) }
      if (v != null) { currentPts.push([px, v]); vMax = Math.max(vMax, Math.abs(v)) }
    }
    return { sun, tidePts, currentPts, hMin, hMax, vMax }
  }, [route, day, nextDay, span, events, tides])

  const { sun, tidePts, currentPts, hMin, hMax, vMax } = shapes
  const yTide = h => 130 - (h - hMin) / ((hMax - hMin) || 1) * 105
  const yCurrent = v => 72 - v / (vMax || 1) * 55
  const cursorX = minutes * 60_000 / span * W

  return (
    <svg id="chart" viewBox={`0 0 ${W} ${HEIGHT}`} preserveAspectRatio="none" role="img"
      aria-label="Tide height and current speed across the selected day">
      <rect x="0" y="0" width={Math.max(0, x(sun.rise))} height={HEIGHT} fill="#06101a" />
      <rect x={x(sun.set)} y="0" width={Math.max(0, W - x(sun.set))} height={HEIGHT} fill="#06101a" />
      {trip && <>
        <rect x={x(trip.launch)} y="0" width={x(trip.back) - x(trip.launch)} height={HEIGHT} fill="rgba(34,197,94,.18)" />
        <line x1={x(trip.turn)} x2={x(trip.turn)} y1="0" y2={HEIGHT} stroke="#f59e0b" strokeDasharray="3 3" />
      </>}
      {Array.from({ length: 9 }, (_, i) => i * 3).map(h => (
        <g key={h}>
          <line x1={h * 25} x2={h * 25} y1="0" y2={HEIGHT - 14} stroke="#24445c" strokeWidth=".5" />
          {h < 24 && <text x={h * 25 + 2} y={HEIGHT - 3} fill="#8fb0c4" fontSize="10">{hourLabel(h)}</text>}
        </g>
      ))}
      {tidePts.length > 0 && (
        <path d={`M${tidePts.map(p => `${p[0]},${yTide(p[1])}`).join('L')}L${W},146L0,146Z`}
          fill="rgba(59,130,246,.22)" stroke="#3b82f6" strokeWidth="2" />
      )}
      {currentPts.length > 0 && <>
        <line x1="0" x2={W} y1="72" y2="72" stroke="#fb923c" strokeOpacity=".35" strokeDasharray="2 4" />
        <path d={`M${currentPts.map(p => `${p[0]},${yCurrent(p[1])}`).join('L')}`} fill="none" stroke="#fb923c" strokeWidth="2" />
        {!approx && <text x="4" y="12" fill="#fb923c" fontSize="10">±{vMax.toFixed(1)} kn</text>}
      </>}
      <line x1={cursorX} x2={cursorX} y1="0" y2={HEIGHT} stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
