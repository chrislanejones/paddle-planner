import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { INLETS } from '../lib/routes.js'
import { bearing, fmtClock, offsetLine } from '../lib/planner.js'
import { storage } from '../lib/storage.js'
import { MAX_TILE_RETRIES, createTileTracker } from '../lib/tileProgress.js'

const STATIC = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1'
const ESRI_ATTRIBUTION = 'Powered by <a href="https://www.esri.com">Esri</a> | Esri, TomTom, Garmin, FAO, NOAA, USGS'
const NOAA_CHART = 'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer'
export const DEFAULT_BASEMAP = 'NOAA Nautical Chart'

// The map is always light (a chart), so these stay fixed across themes and read on every base layer
// thanks to the white casing. They mirror --out, --back, --slack and --hazard in tokens.css.
const ROUTE = { out: '#0b7a3e', back: '#0a62a3', slack: '#b45f06', hazard: '#b3195f', casing: '#ffffff' }
const INLET_RING_METERS = 700 // approximate: the danger zone is wider in an outgoing ebb

const arrowIcon = (deg, color, size = 18) => L.divIcon({
  className: 'arrow-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  html: `<svg width="${size}" height="${size}" viewBox="0 0 20 20" style="transform:rotate(${deg}deg)"><path d="M10 1 L17 17 L10 13 L3 17 Z" fill="${color}" stroke="#ffffff" stroke-width="1.6"/></svg>`,
})

function buildBasemaps(key) {
  const bases = {}
  // 512px tiles mean about a quarter as many requests per screen as the default 256px.
  const chart = L.tileLayer.wms(NOAA_CHART, {
    layers: '1,2,3,4,5,6,7', format: 'image/png', transparent: true, version: '1.3.0', maxZoom: 19,
    tileSize: 512, keepBuffer: 1, updateWhenZooming: false,
    attribution: 'NOAA Office of Coast Survey · not for navigation',
  })
  // NOAA's server intermittently answers a tile with an HTML "Web Adaptor could not access any server
  // machines" page (HTTP 200), which the browser blocks as a bad image and Leaflet leaves as a hole.
  // Reproduced at roughly 1 in 8 requests under a normal pan, so retry with a short exponential back-off (150 ms, then doubling, capped at 4 s).
  chart.on('tileerror', ({ tile }) => {
    tile.retries = (tile.retries ?? 0) + 1
    if (tile.retries > MAX_TILE_RETRIES) return
    const delay = Math.min(4000, 150 * 2 ** (tile.retries - 1)) * (0.75 + Math.random() * 0.5)
    setTimeout(() => {
      if (tile.isConnected) tile.src = `${tile.src.split('&_r=')[0]}&_r=${Date.now()}`
    }, delay)
  })
  bases[DEFAULT_BASEMAP] = chart
  bases.OpenStreetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' })
  if (key) {
    const token = encodeURIComponent(key)
    const styled = style => L.tileLayer(`${STATIC}/${style}/static/tile/{z}/{y}/{x}?token=${token}`,
      { tileSize: 512, zoomOffset: -1, maxZoom: 19, attribution: ESRI_ATTRIBUTION })
    bases['ArcGIS Navigation'] = styled('arcgis/navigation')
    bases['ArcGIS Outdoor'] = styled('arcgis/outdoor')
    bases['ArcGIS Satellite'] = L.layerGroup([
      L.tileLayer(`https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${token}`,
        { maxZoom: 19, attribution: 'Esri, Maxar, Earthstar Geographics' }),
      styled('arcgis/imagery/labels'),
    ])
  }
  return bases
}

// Imperative Leaflet wrapped in effects. Each effect owns one layer group so
// a change in one prop never rebuilds the rest of the map.
export default function MapView({ route, visible = true, focus, window: trip, drawing, drawPoints, onDrawPoint, stationMarker, arcgisKey }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({})
  const handledFocusRef = useRef(0)
  const onDrawPointRef = useRef(onDrawPoint)
  const drawingRef = useRef(drawing)
  const tracker = useRef(createTileTracker()).current
  const [load, setLoad] = useState({ total: 0, done: 0, pending: 0, retrying: 0, failed: 0 })
  const [slow, setSlow] = useState(false)
  useEffect(() => { onDrawPointRef.current = onDrawPoint; drawingRef.current = drawing })

  useEffect(() => {
    const map = L.map(containerRef.current).setView([29.85, -81.28], 11)
    mapRef.current = map
    layersRef.current = {
      hazard: L.layerGroup().addTo(map),
      route: L.layerGroup().addTo(map),
      station: L.layerGroup().addTo(map),
      draw: L.layerGroup().addTo(map),
    }
    INLETS.forEach(inlet => {
      L.circle([inlet.lat, inlet.lng], {
        radius: INLET_RING_METERS, color: ROUTE.hazard, weight: 2, dashArray: '6 6', fillColor: ROUTE.hazard, fillOpacity: 0.08,
      }).bindTooltip(`${inlet.name}: strongest current. Stay out of the throat. Ring is approximate.`).addTo(layersRef.current.hazard)
      L.circleMarker([inlet.lat, inlet.lng], { radius: 5, color: '#ffffff', weight: 2, fillColor: ROUTE.hazard, fillOpacity: 1 })
        .addTo(layersRef.current.hazard)
    })
    map.on('click', e => {
      if (drawingRef.current) onDrawPointRef.current([+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)])
    })
    map.on('baselayerchange', e => {
      storage.set('pp_basemap', e.name)
      map.getContainer().dataset.base = e.name
    })
    // The panel beside the map settles after the first paint (fonts, scrollbar), so Leaflet can start with a stale size
    // and leave part of the map blank. Telling it whenever the box changes keeps every tile in view.
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }))
    observer.observe(containerRef.current)
    return () => { observer.disconnect(); map.remove(); mapRef.current = null; layersRef.current = {} }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const bases = buildBasemaps(arcgisKey)
    // Report every tile to the tracker. A rAF batches the many events a pan fires into one update.
    let frame = 0
    const sync = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; setLoad(tracker.summary()) }) }
    const watch = layer => {
      if (layer instanceof L.LayerGroup) { layer.eachLayer(watch); return }
      layer.on('tileloadstart', e => { tracker.start(e.tile); sync() })
      layer.on('tileload', e => { tracker.done(e.tile); sync() })
      layer.on('tileerror', e => { tracker.error(e.tile); sync() })
      layer.on('tileunload', e => { tracker.unload(e.tile); sync() })
    }
    Object.values(bases).forEach(watch)
    const saved = storage.get('pp_basemap')
    const name = bases[saved] ? saved : DEFAULT_BASEMAP
    bases[name].addTo(map)
    map.getContainer().dataset.base = name
    const control = L.control.layers(bases, null, { position: 'topright', collapsed: true }).addTo(map)
    return () => {
      cancelAnimationFrame(frame)
      tracker.clear()
      map.removeControl(control)
      Object.values(bases).forEach(layer => map.removeLayer(layer))
    }
  }, [arcgisKey, tracker])

  // Hold the bar back for a moment so a quick load never flashes it.
  const busy = load.pending > 0
  useEffect(() => {
    if (!busy) { setSlow(false); return undefined }
    const timer = setTimeout(() => setSlow(true), 350)
    return () => clearTimeout(timer)
  }, [busy])
  const retryTiles = () => {
    tracker.clear()
    mapRef.current.eachLayer(layer => { if (layer instanceof L.TileLayer) layer.redraw() })
  }

  useEffect(() => {
    mapRef.current.getContainer().style.cursor = drawing ? 'crosshair' : ''
  }, [drawing])

  useEffect(() => {
    const map = mapRef.current
    if (!visible || route.pts.length < 2) return
    if (focus && focus.key !== handledFocusRef.current) return // a region pick is moving the map instead
    const bounds = L.polyline(route.pts).getBounds()
    // A route the visitor just drew is already on screen: leave their zoom and position alone.
    if (route.id === 'custom' && map.getBounds().contains(bounds)) return
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- focus is read only when the route changes
  }, [route, visible])

  // Picking a region frames every route in it, so the map moves to where the routes are.
  useEffect(() => {
    if (!focus?.key || focus.key === handledFocusRef.current) return
    handledFocusRef.current = focus.key
    if (focus.pts.length > 1) mapRef.current.fitBounds(L.polyline(focus.pts).getBounds(), { padding: [30, 30], maxZoom: focus.maxZoom ?? 12 })
  }, [focus])

  useEffect(() => {
    const layer = layersRef.current.route
    layer.clearLayers()
    if (!visible || drawing || route.pts.length < 2) return
    const pts = route.pts
    const back = offsetLine(pts.slice().reverse(), 45)
    L.polyline(pts, { color: ROUTE.casing, weight: 10, opacity: 0.9, interactive: false }).addTo(layer)
    L.polyline(back, { color: ROUTE.casing, weight: 8, opacity: 0.9, interactive: false }).addTo(layer)
    L.polyline(pts, { color: ROUTE.out, weight: 5, opacity: 1, interactive: false }).addTo(layer)
    L.polyline(back, { color: ROUTE.back, weight: 4, dashArray: '8 8', interactive: false }).addTo(layer)
    const arrows = (line, color) => line.slice(0, -1).forEach((a, i) => {
      const b = line[i + 1]
      L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { icon: arrowIcon(bearing(a, b), color), interactive: false }).addTo(layer)
    })
    arrows(pts, ROUTE.out)
    arrows(back, ROUTE.back)
    const startLabel = trip ? `Launch ${fmtClock(trip.launch)}<br>Return ${fmtClock(trip.back)}` : 'Start'
    // Put the turnaround label on the side away from the route so it never covers the line or the current badge.
    const endBelow = pts.at(-1)[0] <= pts.at(-2)[0]
    const endLabel = trip ? `Turn ${fmtClock(trip.turn)}<br><small>slack, current flips</small>` : 'Turnaround'
    L.circleMarker(pts[0], { radius: 8, color: ROUTE.out, fillColor: '#ffffff', fillOpacity: 1, weight: 4 })
      .bindTooltip(startLabel, { permanent: true, direction: 'left', className: 'lbl out', offset: [-10, 0] }).addTo(layer)
    L.marker(pts.at(-1), { icon: L.divIcon({ className: 'turn-mark', html: '<span class="turn-diamond"></span>', iconSize: [18, 18], iconAnchor: [9, 9] }) })
      .bindTooltip(endLabel, { permanent: true, direction: endBelow ? 'bottom' : 'top', className: 'lbl turn', offset: [0, endBelow ? 14 : -14] }).addTo(layer)
  }, [route, visible, trip, drawing])

  useEffect(() => {
    const layer = layersRef.current.draw
    layer.clearLayers()
    if (!drawing) return
    if (drawPoints.length) L.polyline(drawPoints, { color: '#0b2233', weight: 3, dashArray: '4 6' }).addTo(layer)
    drawPoints.forEach((p, i) => L.circleMarker(p, { radius: 6, color: '#ffffff', weight: 2, fillColor: i ? '#0b2233' : ROUTE.out, fillOpacity: 1 }).addTo(layer))
  }, [drawing, drawPoints])

  useEffect(() => {
    const layer = layersRef.current.station
    layer.clearLayers()
    if (!stationMarker) return
    const { lat, lng, name, label, dir } = stationMarker
    if (Number.isFinite(dir)) L.marker([lat, lng], { icon: arrowIcon(dir, '#b45309', 26) }).addTo(layer)
    const badge = document.createElement('span')
    badge.className = 'cur-badge'
    badge.textContent = label
    const tip = document.createElement('span')
    tip.textContent = name // station names come from NOAA: never inject as HTML
    L.marker([lat, lng], { icon: L.divIcon({ className: 'arrow-icon', iconAnchor: [-14, 10], html: badge }) })
      .bindTooltip(tip).addTo(layer)
  }, [stationMarker])

  const percent = load.total ? Math.round(100 * load.done / load.total) : 0
  const gaveUp = !busy && load.failed > 0
  return (
    <div className="map-wrap">
      <div id="map" ref={containerRef} role="application" aria-label="Map of the selected paddling route" />
      {((busy && slow) || gaveUp) && (
        <div className="map-load" role="status">
          <div className="map-load-row">
            <span>
              {gaveUp ? 'Some map tiles didn’t load.'
                : load.retrying > 0 ? `The chart server is slow. Retrying ${load.retrying} of ${load.total} tiles…`
                  : `Loading map… ${load.done} of ${load.total} tiles`}
            </span>
            {gaveUp && <button type="button" onClick={retryTiles}>Try again</button>}
          </div>
          {busy && (
            <div className="map-bar" role="progressbar" aria-label="Map tiles loaded" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
              <span style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
