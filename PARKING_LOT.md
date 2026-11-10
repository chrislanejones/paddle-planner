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
- Routes: twenty-eight presets now. Everything added since Guana was traced from the NOAA chart because OpenStreetMap's
  Overpass servers were down. When Overpass is back, confirm real launch points (Guana Lake dam, Anastasia, Palm Coast,
  Marineland, Sisters Creek, Pumpkin Hill, Ortega, Clapboard Creek, Dutton Island, Fort Clinch, Egans Creek) and pull the
  ramp coordinates into each route's first point.
- Duval gaps: Huguenot Memorial Park and the Mayport inlet (strong current and ship traffic), Julington Creek (the chart
  covers only about 1 km of it), Simpson Creek and the Cedar River (both failed the chart check), Black Creek, the Trout
  River, Hanna Park, and the open St. Johns River. Nassau gaps: Egans Creek, Lofton Creek, Amelia Island State Park.
- The Duval routes run 4 to 6.5 km one way, longer than the St. Augustine ones. Trim or add shorter variants.
- The route picker groups by county. The St. Johns River routes name Mayport as their inlet because water reaches
  them there, not through the nearest inlet by straight line. Re-check that if more river routes go in.
- Palm Coast is 15.9 km from the nearest tide station (Fort Matanzas), so the app shows its "may be in a different
  waterway" warning. Add a closer tide and current station to `TIDE_STATIONS` for that stretch.
- Anastasia runs on the Intracoastal channel, which has boat traffic. Consider a short note on that route.
- The chart check script (sample the WMS image every 40 m, count land pixels) lives only in /tmp. Worth moving into
  `scripts/` if more routes get added. Pitfall found: keep the image aspect ratio exact or the server shifts the bbox.
- Launch windows only list slack turns where the current carries you out, so the other slack of each tide is
  hidden. A "return-first" mode could list those.
- Live water level: NOAA has no gauge between Mayport and Daytona, so St. Augustine routes borrow Mayport (57 km) and
  Palm Coast shows nothing. Re-check the `waterlevels` station list from time to time; a St. Augustine gauge would help most.
- Overlay the measured last-hour line on the tide chart as a dotted trace. Left off because the chart is exactly how
  it was approved.
- County picker: seven counties (Baker, Clay, Duval, Flagler, Nassau, Putnam, St. Johns), each split into sections by
  dot. A route lands in the section whose dot is closest to its launch. Dots are hand-placed in `src/lib/counties.js`.
  Sections with no routes show as disabled. Olustee (Baker) and a few others are empty until someone adds a route there.
- Inland routes (Baker, Clay, Putnam, and the St. Johns River creeks) come from the USGS National Hydrography Dataset,
  not from a chart check. Launch points are on the waterway line, not confirmed boat ramps or put-ins. Confirm access,
  parking and permission for each before it is described as a launch. The app has no river-level data for them.
- Removed 11-09-2026: the North, Middle and South Prong of the St. Marys, the North and South Fork of Black Creek, Deep
  Creek, Peters Creek, Governors Creek and Rice Creek, plus the St. Johns River line at Green Cove Springs (mid-channel). The NHD flowlines were swamp drainage with no mapped stream on OpenStreetMap, so the lines ran through woods
  and subdivisions. Check any new inland route against OpenStreetMap, not only the NOAA chart: the chart is blank tan
  inland, so a good river and a bad one look the same there. Baker is left with one route, the St. Marys on the state line.
- Non-tidal routes (`tidal: false`) show daylight trips instead of slack-water windows, and skip the tide chart and
  live gauge. NOAA has no river-flow product wired in. USGS stream gauges would let the app say "too low" or "running high".
- Several routes sit on a county line (the St. Johns River is the Clay / St. Johns border; the St. Marys prongs run along
  Baker). They are filed under the county the launch point is in.
- The USGS flowline service (`hydro.nationalmap.gov`) was slow and sometimes timed out. The route builder script lives only
  in /tmp (`nhd.py`, `build_routes.py`). Worth moving to `scripts/` if more routes get added.
