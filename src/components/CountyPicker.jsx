import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { COUNTIES, countyByName } from '../lib/counties.js'
import { PATHS, toSvg } from '../lib/countySvg.js'
import { ArrowLeft } from './icons.js'

// Top: the county map, drawn from a real county SVG. Choosing a county zooms to that one county, splits it into
// sections and shows a dot in each. Below: the county links, then the sections as links. Dots, shapes and links all
// do the same thing, so the map works by mouse, touch or keyboard.
const COS = Math.cos(30.2 * Math.PI / 180)
const ASPECT = 1.1 // width / height of the map box, so every view fits the same frame
const MS = 520
const GAP = 3 // px of space between neighboring counties

const NEIGHBORS = Object.keys(PATHS).filter(name => !countyByName(name))

function unionBounds(names) {
  const b = names.map(n => PATHS[n].bounds)
  return [Math.min(...b.map(v => v[0])), Math.max(...b.map(v => v[1])), Math.min(...b.map(v => v[2])), Math.max(...b.map(v => v[3]))]
}
function viewFor([x0, x1, y0, y1], pad) {
  const w0 = (x1 - x0) * (1 + pad), h0 = (y1 - y0) * (1 + pad)
  const w = Math.max(w0, h0 * ASPECT), h = w / ASPECT
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }
}
const REGION = viewFor(unionBounds(COUNTIES.map(c => c.name)), 0.04)
const CENTERS = Object.fromEntries(COUNTIES.map(c => { const [x0, x1, y0, y1] = PATHS[c.name].bounds; return [c.name, [(x0 + x1) / 2, (y0 + y1) / 2]] }))

// Each section is the part of the county closest to its dot: a Voronoi cell, found by trimming a big box with the
// halfway line to every other dot. It is worked out in kilometers, the same rule that files a route under a section,
// then moved onto the SVG. The county outline clips the cells, so the sections tile the county exactly.
const km = (lng, lat) => [lng * COS, -lat]
const kmToSvg = ([x, y]) => toSvg(x / COS, -y)
function cutHalfPlane(poly, nx, ny, limit) { // keeps the side where nx*x + ny*y <= limit
  const out = []
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const da = nx * a[0] + ny * a[1] - limit, db = nx * b[0] + ny * b[1] - limit
    if (da <= 0) out.push(a)
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) {
      const t = da / (da - db)
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
    }
  })
  return out
}
function sectionCells(county) {
  const [x0, y1] = km(-83, 29), [x1, y0] = km(-80.5, 31.2)
  const sites = county.sections.map(s => km(s.lng, s.lat))
  return sites.map((site, i) => {
    let poly = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    sites.forEach((other, j) => {
      if (j === i || !poly.length) return
      poly = cutHalfPlane(poly, other[0] - site[0], other[1] - site[1], (other[0] ** 2 + other[1] ** 2 - site[0] ** 2 - site[1] ** 2) / 2)
    })
    return poly.length ? `M${poly.map(p => kmToSvg(p).map(n => n.toFixed(2)).join(' ')).join('L')}Z` : ''
  })
}

const ease = t => 1 - (1 - t) ** 3
const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Tweens the viewBox. The rest of the drawing reads the current box, so dots and strokes keep their pixel size.
function useTween(target) {
  const [view, setView] = useState(target)
  const current = useRef(target)
  useEffect(() => {
    const from = current.current
    if (reduced()) { current.current = target; setView(target); return undefined }
    let frame
    const start = performance.now()
    const tick = now => {
      const k = ease(Math.min(1, (now - start) / MS))
      const next = Object.fromEntries(Object.keys(target).map(key => [key, from[key] + (target[key] - from[key]) * k]))
      current.current = next
      setView(next)
      if (k < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return view
}

const keyActivate = fn => e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn() } }
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

export default function CountyPicker({ scope, countyCount, sectionCount, bestCount, hasYours, onBest, onCounty, onSection, onYours }) {
  // Back goes up one level: from a section to its county, from a county to the whole map.
  const goBack = scope.kind === 'section' ? () => onCounty(scope.county) : onBest
  const backLabel = scope.kind === 'section' ? `${scope.county} County` : 'All counties'
  const county = scope.kind === 'county' || scope.kind === 'section' ? countyByName(scope.county) : null
  const target = useMemo(() => (county ? viewFor(PATHS[county.name].bounds, 0.1) : REGION), [county])
  const view = useTween(target)

  const box = useRef(null)
  const [px, setPx] = useState(400)
  useLayoutEffect(() => {
    if (!box.current) return undefined
    const observer = new ResizeObserver(([entry]) => setPx(entry.contentRect.width || 400))
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [])
  const u = view.w / px // one CSS pixel, in drawing units

  const dots = county?.sections ?? []
  const cells = useMemo(() => (county ? sectionCells(county) : []), [county])
  const clipId = useId()
  const gap = GAP * u

  return (
    <div className="geo-wrap">
      <div className="geo">
        <div className="geo-map" ref={box}>
          <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} role="group"
            aria-label={county ? `${county.name} County sections` : 'First Coast counties'}>
            {NEIGHBORS.map(n => (
              <path key={n} className={`geo-neighbor${county ? ' faded' : ''}`} d={PATHS[n].d} strokeWidth={gap} />
            ))}
            {COUNTIES.map(c => {
              const n = countyCount(c.name)
              const picked = county?.name === c.name
              const hidden = county && !picked
              const live = n > 0 && !county
              const cls = `geo-county${picked ? ' picked' : ''}${hidden ? ' faded' : ''}${n === 0 ? ' off' : ''}`
              return (
                <g key={c.name} className={cls}
                  {...(live ? { role: 'button', tabIndex: 0, 'aria-label': `${c.name} County, ${plural(n, 'route')}`, onClick: () => onCounty(c.name), onKeyDown: keyActivate(() => onCounty(c.name)) } : { 'aria-hidden': 'true' })}>
                  <path d={PATHS[c.name].d} strokeWidth={gap} />
                  {!county && <text className="geo-name" x={CENTERS[c.name][0]} y={CENTERS[c.name][1] + 4 * u} fontSize={12 * u} textAnchor="middle">{c.name}</text>}
                </g>
              )
            })}
            {county && <clipPath id={clipId}><path d={PATHS[county.name].d} /></clipPath>}
            {dots.map((s, i) => {
              const n = sectionCount(county.name, s.name)
              const on = scope.kind === 'section' && scope.section === s.name
              const [x, y] = toSvg(s.lng, s.lat)
              const label = n > 0 ? `${s.name}, ${plural(n, 'route')}` : `${s.name}, no routes yet`
              const pick = () => onSection(on ? null : s.name)
              const props = n > 0
                ? { role: 'button', tabIndex: 0, 'aria-pressed': on, onClick: pick, onKeyDown: keyActivate(pick) }
                : { role: 'img', 'aria-disabled': 'true' }
              return (
                <g key={s.name} className={`geo-dot${on ? ' on' : ''}${n === 0 ? ' off' : ''}`} aria-label={label} {...props}>
                  <title>{label}</title>
                  <path className="geo-cell" d={cells[i]} clipPath={`url(#${clipId})`} strokeWidth={gap} />
                  <circle className="geo-hit" cx={x} cy={y} r={16 * u} />
                  <circle className="geo-disc" cx={x} cy={y} r={9 * u} strokeWidth={2 * u} />
                  <text className="geo-n" x={x} y={y + 4 * u} fontSize={11 * u} textAnchor="middle">{i + 1}</text>
                </g>
              )
            })}
            {county && <path className="geo-edge" d={PATHS[county.name].d} />}
          </svg>
          {county && (
            <button type="button" className="geo-back-map" onClick={goBack}><ArrowLeft size={16} aria-hidden="true" />Back to {backLabel}</button>
          )}
        </div>

        <nav className="geo-list" aria-label="Counties">
          <h3 className="geo-title">Counties</h3>
          <ul>
            <li>
              <button type="button" className="geo-link" aria-pressed={scope.kind === 'best'} onClick={onBest}>
                <span>First Coast best</span><span className="geo-count">{bestCount}</span>
              </button>
            </li>
            {COUNTIES.map(c => {
              const n = countyCount(c.name)
              const on = (scope.kind === 'county' || scope.kind === 'section') && scope.county === c.name
              return (
                <li key={c.name}>
                  <button type="button" className="geo-link" aria-pressed={on} disabled={n === 0} onClick={() => onCounty(c.name)}>
                    <span>{c.name}</span><span className="geo-count">{n}</span>
                  </button>
                </li>
              )
            })}
            {hasYours && (
              <li>
                <button type="button" className="geo-link" aria-pressed={scope.kind === 'yours'} onClick={onYours}>
                  <span>Your route</span><span className="geo-count">1</span>
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>

      {county && (
        <div className="geo-sections">
          <div className="geo-sections-head"><span>{county.name} County sections</span></div>
          <ul>
            {dots.map((d, i) => {
              const n = sectionCount(county.name, d.name)
              const on = scope.kind === 'section' && scope.section === d.name
              return (
                <li key={d.name}>
                  <button type="button" className="geo-sec" title={d.name} aria-pressed={on} disabled={n === 0} onClick={() => onSection(on ? null : d.name)}>
                    <span className="geo-sec-n" aria-hidden="true">{i + 1}</span><span className="geo-sec-name">{d.name}</span><span className="geo-count">{n}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
