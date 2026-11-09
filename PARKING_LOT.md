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
- More routes: seven presets now. Summer Haven (the Intracoastal between Marineland and Matanzas Inlet) was skipped:
  the OSM centerline disagrees with the NOAA chart channel at the bends. Retry with a hand-traced line, and add
  Guana, Anastasia and Palm Coast routes if wanted. Validate with the water-pixel check against the chart WMS.
- Launch windows only list slack turns where the current carries you out, so the other slack of each tide is
  hidden. A "return-first" mode could list those.
