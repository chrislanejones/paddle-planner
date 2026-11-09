# Parking lot

- README for the repo (route it through the `chris-voice` skill).
- `.env.example` is not committed: it matches the `.env*` read-deny rule, so it was not checked for
  placeholders. The app reads `VITE_ARCGIS_API_KEY`; confirm that name matches the file, then add it.
- Current-station list shows several bins per NOAA station; consider collapsing to the best bin.
- `paddle-planner.html` (the original single-file app) is kept as the reference until the port is signed off.
- NOAA's cached chart tile host (`tileservice.charts.noaa.gov`) did not connect from the dev machine, so the
  map uses NOAA's dynamic WMS, which intermittently returns an HTML error page. Retry covers it; recheck the
  tile host later, it would be more reliable.
- Map-label and route colors in `MapView.jsx` are fixed hex values mirroring the tokens; consider reading them
  from CSS variables.
- More routes: pull real launch points and waterway centerlines from OpenStreetMap (Overpass works with a User-Agent),
  check each point against the NOAA chart, add to `src/lib/routes.js`.
