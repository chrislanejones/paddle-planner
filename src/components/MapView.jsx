import { useEffect, useRef } from 'react'
import L from 'leaflet'
import { INLETS } from '../lib/routes.js'
import { bearing, fmtTime, offsetLine } from '../lib/planner.js'
import { storage } from '../lib/storage.js'

const STATIC = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1'
const ESRI_ATTRIBUTION = 'Powered by <a href="https://www.esri.com">Esri</a> | Esri, TomTom, Garmin, FAO, NOAA, USGS'

const arrowIcon = (deg, color, size = 18) => L.divIcon({
  className: 'arrow-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
  html: `<svg width="${size}" height="${size}" viewBox="0 0 20 20" style="transform:rotate(${deg}deg)"><path d="M10 1 L17 17 L10 13 L3 17 Z" fill="${color}" stroke="#0b1620" stroke-width="1.2"/></svg>`,
})

function buildBasemaps(key) {
  const bases = {}
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
  bases.OpenStreetMap = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' })
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
      route: L.layerGroup().addTo(map),
      station: L.layerGroup().addTo(map),
      draw: L.layerGroup().addTo(map),
    }
    INLETS.forEach(inlet => L.circleMarker([inlet.lat, inlet.lng], { radius: 6, color: '#ef4444', fillOpacity: 0.8 })
      .bindTooltip(`⚠️ ${inlet.name}`).addTo(map))
    map.on('click', e => {
      if (drawingRef.current) onDrawPointRef.current([+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)])
    })
    map.on('baselayerchange', e => storage.set('pp_basemap', e.name))
    return () => { map.remove(); mapRef.current = null; layersRef.current = {} }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const bases = buildBasemaps(arcgisKey)
    const saved = storage.get('pp_basemap')
    const current = bases[saved] || Object.values(bases)[0]
    current.addTo(map)
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
    L.polyline(pts, { color: '#22c55e', weight: 5, opacity: 0.95 }).addTo(layer)
    L.polyline(back, { color: '#38bdf8', weight: 4, dashArray: '8 8' }).addTo(layer)
    const arrows = (line, color) => line.slice(0, -1).forEach((a, i) => {
      const b = line[i + 1]
      L.marker([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], { icon: arrowIcon(bearing(a, b), color), interactive: false }).addTo(layer)
    })
    arrows(pts, '#22c55e')
    arrows(back, '#38bdf8')
    const startLabel = trip ? `🚣 Launch ${fmtTime(trip.launch)}<br>🏁 Back by ${fmtTime(trip.back)}` : 'Start'
    const endLabel = trip ? `↩︎ Turn around ${fmtTime(trip.turn)}<br><small>slack · current flips</small>` : 'Turnaround'
    L.circleMarker(pts[0], { radius: 7, color: '#22c55e', fillColor: '#0b1620', fillOpacity: 1, weight: 3 })
      .bindTooltip(startLabel, { permanent: true, direction: 'left', className: 'lbl out', offset: [-8, 0] }).addTo(layer)
    L.circleMarker(pts.at(-1), { radius: 7, color: '#f59e0b', fillColor: '#0b1620', fillOpacity: 1, weight: 3 })
      .bindTooltip(endLabel, { permanent: true, direction: 'right', className: 'lbl turn', offset: [8, 0] }).addTo(layer)
  }, [route, trip, drawing])

  useEffect(() => {
    const layer = layersRef.current.draw
    layer.clearLayers()
    if (!drawing) return
    if (drawPoints.length) L.polyline(drawPoints, { color: '#fff', dashArray: '4 6' }).addTo(layer)
    drawPoints.forEach((p, i) => L.circleMarker(p, { radius: 5, color: i ? '#fff' : '#22c55e' }).addTo(layer))
  }, [drawing, drawPoints])

  useEffect(() => {
    const layer = layersRef.current.station
    layer.clearLayers()
    if (!stationMarker) return
    const { lat, lng, name, label, dir } = stationMarker
    if (Number.isFinite(dir)) L.marker([lat, lng], { icon: arrowIcon(dir, '#fb923c', 26) }).addTo(layer)
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
