# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite, Leaflet for the map, plain CSS with design tokens, Phosphor icons, self-hosted Archivo. Static site: deployed to GitHub Pages.

## Users

Kayakers and stand-up paddleboarders in Northeast Florida, from Jacksonville to Palm Coast. They plan the night before on a desktop, then re-check on a phone at a launch ramp or dock, often early morning, in glare, with wet hands. (Inferred from the app's content; not interviewed.)

## Product Purpose

Pick a launch time so a trip rides the tail of one current out and the start of the next one back, centered on slack water. Success is a paddler leaving with a launch time, a turnaround time, and a clear picture of daylight, wind and the inlet hazard.

## Positioning

Slack-water trip windows computed per route from NOAA tide and current predictions, shown on the NOAA nautical chart. A generic tide table gives times; this gives the whole out-and-back trip and where it sits in the day.

## Operating Context

NOAA CO-OPS tide and current predictions, NWS hourly wind, NOAA Office of Coast Survey chart tiles. All times Eastern. Predictions are astronomical: wind, runoff and storm surge move them. The chart service is not for navigation and is occasionally flaky; the app retries failed tiles.

## Capabilities and Constraints

- Nineteen preset routes (a region picker, then that region's routes) plus one custom route drawn on the map, saved in the browser.
- Trip length 1.5 to 5 hours, seven days out, daylight and wind per window.
- Falls back to tide-based estimates when no current station is within range.
- No backend and no accounts. An optional ArcGIS API key is stored only in the visitor's browser.
- Routes run from Nassau Sound to Palm Coast. Undecided: regions farther north or south, and the lower St. Johns River.

## Brand Commitments

Name: "Paddle Tide & Current Planner". Safety copy ("check the marine forecast, wear a PFD, tell someone your float plan") stays visible.

## Evidence on Hand

Live NOAA and NWS data, real route coordinates and inlet positions in `src/lib/routes.js`. No testimonials, usage numbers or user research exist; do not invent any.

## Product Principles

1. Decide fast: the best windows come before any setting.
2. Safety is information, not decoration: hazards are drawn where they are.
3. Honest uncertainty: estimates are labeled as estimates, failures say what to do next.
4. Readable outdoors first: contrast and tap targets are requirements, not polish.

## Accessibility & Inclusion

WCAG 2.1 AA contrast for every text and control color, enforced by `src/lib/tokens.test.js`. 44px minimum touch targets, visible focus, no information carried by color alone, reduced-motion respected.
