# Parking lot

- README for the repo (route it through the `chris-voice` skill).
- GitHub Pages deploy workflow (`vite.config.js` already uses `base: './'`).
- `.env.example` was left out of the first commit: it matches the `.env*` read-deny rule, so it was not
  checked for placeholders. The app reads `VITE_ARCGIS_API_KEY`; confirm that name matches the file.
- Current-station list shows several bins per NOAA station; consider collapsing to the best bin.
- `paddle-planner.html` (the original single-file app) is kept as the reference until the port is signed off.
