# Parking lot

- `.env.example` is not committed: it matches the `.env*` read-deny rule, so it was not checked for
  placeholders. The app reads `VITE_ARCGIS_API_KEY`; confirm that name matches the file, then add it.
- Current-station list shows several bins per NOAA station; consider collapsing to the best bin.
- `paddle-planner.html` (the original single-file app) is kept as the reference until the port is signed off.
- NOAA's cached chart tile host (`tileservice.charts.noaa.gov`) did not connect from the dev machine, so the
  map uses NOAA's dynamic WMS, which intermittently returns an HTML error page. Retry covers it; recheck the
  tile host later, it would be more reliable.
- Map-label and route colors in `MapView.jsx` are fixed hex values mirroring the tokens; consider reading them
  from CSS variables.
- Routes: eleven presets now. The newest four (Guana, Anastasia, Palm Coast, Summer Haven) were traced from the NOAA
  chart because OpenStreetMap's Overpass servers were down. When Overpass is back, confirm the real launch points
  (Guana Lake dam ramp, Anastasia, Palm Coast, Marineland) and pull the ramp coordinates into the first point.
- Palm Coast is 15.9 km from the nearest tide station (Fort Matanzas), so the app shows its "may be in a different
  waterway" warning. Add a closer tide and current station to `TIDE_STATIONS` for that stretch.
- Anastasia runs on the Intracoastal channel, which has boat traffic. Consider a short note on that route.
- The chart check script (sample the WMS image every 40 m, count land pixels) lives only in /tmp. Worth moving into
  `scripts/` if more routes get added. Pitfall found: keep the image aspect ratio exact or the server shifts the bbox.
- Launch windows only list slack turns where the current carries you out, so the other slack of each tide is
  hidden. A "return-first" mode could list those.
