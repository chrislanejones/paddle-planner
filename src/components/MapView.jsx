import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { INLETS } from '../lib/routes.js'
import { bearing, fmtClock, offsetLine } from '../lib/planner.js'
import { storage } from '../lib/storage.js'

const STATIC = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1'
const ESRI_ATTRIBUTION = 'Powered by <a href="https://www.esri.com">Esri</a> | Esri, TomTom, Garmin, FAO, NOAA, USGS'
const NOAA_CHART = 'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer'
export const DEFAULT_BASEMAP = 'NOAA Nautical Chart'
const MAX_TILE_RETRIES = 6

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
  // Reproduced at roughly 1 in 8 requests under a normal pan, so retry with exponential back-off.
  chart.on('tileerror', ({ tile }) => {
    tile.retries = (tile.retries ?? 0) + 1
    if (tile.retries > MAX_TILE_RETRIES) return
    const delay = Math.min(8000, 250 * 2 ** (tile.retries - 1)) * (0.75 + Math.random() * 0.5)
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
export default function MapView({ route, window: trip, drawing, drawPoints, onDrawPoint, stationMarker, arcgisKey }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layersRef = useRef({})
  const onDrawPointRef = useRef(onDrawPoint)
  const drawingRef = useRef(drawing)
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
    return () => { map.remove(); mapRef.current = null; layersRef.current = {} }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const bases = buildBasemaps(arcgisKey)
    const saved = storage.get('pp_basemap')
    const name = bases[saved] ? saved : DEFAULT_BASEMAP
    bases[name].addTo(map)
    map.getContainer().dataset.base = name
    const control = L.control.layers(bases, null, { position: 'topright', collapsed: true }).addTo(map)
    return () => { map.removeControl(control); Object.values(bases).forEach(layer => map.removeLayer(layer)) }
  }, [arcgisKey])

  useEffect(() => {
    mapRef.current.getContainer().style.cursor = drawing ? 'crosshair' : ''
  }, [drawing])

  useEffect(() => {
    if (route.pts.length > 1) mapRef.current.fitBounds(L.polyline(route.pts).getBounds(), { padding: [60, 60], maxZoom: 14 })
  }, [route])

  useEffect(() => {
    const layer = layersRef.current.route
    layer.clearLayers()
    if (drawing || route.pts.length < 2) return
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
  }, [route, trip, drawing])

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

  return <div id="map" ref={containerRef} role="application" aria-label="Map of the selected paddling route" />
}
