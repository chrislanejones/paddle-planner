---
name: Paddle Tide & Current Planner
description: "Chart Room: nautical-chart cartography as a working tool for paddlers. Light-first, high legibility, one signature slack band."
colors:
  header: "#0a2a43"
  on-header: "#f2f8fb"
  ground: "#f4f8fa"
  panel: "#e6eff5"
  card: "#ffffff"
  ink: "#0b2233"
  mute: "#41596a"
  line: "#c3d3dd"
  control: "#5b7a8c"
  select: "#0a3a5c"
  on-select: "#ffffff"
  focus: "#0a4fb4"
  out: "#0b6b3a"
  back: "#0a5f95"
  slack: "#964f00"
  hazard: "#a8195a"
  tide: "#2b5fa8"
  current: "#b45309"
  night: "#cfdbe4"
  chart-out: "#0b7a3e"
  chart-back: "#0a62a3"
  chart-slack: "#b45f06"
  chart-hazard: "#b3195f"
  chart-ink: "#0b2233"
  chart-edge: "#5b7a8c"
  dark-panel: "#0c2130"
  dark-card: "#11303f"
  dark-ink: "#e7f1f6"
  dark-select: "#cfe8f5"
typography:
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  card-title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
spacing:
  s1: "0.25rem"
  s2: "0.5rem"
  s3: "0.75rem"
  s4: "1rem"
  s5: "1.5rem"
  s6: "2rem"
components:
  button:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.5rem 0.75rem"
    height: "2.75rem"
  button-selected:
    backgroundColor: "{colors.select}"
    textColor: "{colors.on-select}"
  window-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.75rem"
---

# Design System: Paddle Tide & Current Planner

## Overview

**Chart Room.** The product is a tool people use to decide when to launch, so the design is an Operate surface: scanability and familiar controls first. The world it borrows from is NOAA nautical-chart cartography, and it lends exactly four things: palette (deep-water navy shell, shallow-water tinted panels, chart magenta for hazards), type, density, and one signature move. Navigation and controls stay standard: chips, selects, a range slider, buttons.

The use scene decides the theme: a paddler at a ramp at 6 AM with a phone in glare. Light is the designed-first theme; dark follows the system or the header toggle for pre-dawn launches. The map is a chart, so it keeps chart colors in both themes.

**Signature move: the slack band.** One unit drawn the same way in three places: launch to turn is the out leg (green), turn to back is the return leg (blue), and an amber notch marks slack water. It is a 24 hour strip on each window card (night and daylight behind it), a shaded span with out and return halves on the chart, and the white-cased green and dashed blue route with an amber diamond turn marker on the map.

## Colors

Roles, not decoration. Accent color appears only on selection, state, and the trip semantics.

- **Deep-water navy** (`header`): the shell, and the favicon field.
- **Shallow-water tint** (`panel`): the second neutral behind the cards; **card** white sits on it.
- **Ink** and **mute** carry all text; mute is for labels and secondary lines.
- **Out green, return blue, slack amber**: the trip semantics. They always appear together as the slack band.
- **Hazard magenta** (the chart's own hazard color): inlet danger rings and errors.
- **Select navy**: the one selection color (pressed chips, selected window card). In dark it inverts to a pale fill.
- **Tide blue, current orange**: the two chart series only.

Dark theme values live beside the light ones in `src/tokens.css`; the two dark blocks must stay identical.

The **chart-** colors are fixed across themes because the map is always a light chart: they are the route, turn marker, hazard rings and map label plates, and mirror `out`, `back`, `slack` and `hazard` with a little more saturation so they read on buff land and blue water.

### Named Rules

- **Contrast is tested.** Every text/surface pair is at least 4.5:1 and every control edge at least 3:1, in both themes, by `src/lib/tokens.test.js`. Change a token and the build tells you.
- **Color never works alone.** State always pairs color with an icon or text.

## Typography

One family: Archivo (variable, weight and width axes), self-hosted. A sturdy grotesque with signage-style letterforms that hold up in glare and on small screens. Its width axis does the job of a second typeface: data digits run narrow (78%) like a tide table's columns, tracked caps labels run slightly narrow (88%), and reading text stays at normal width. Three roles carry the hierarchy: **data** (large bold tabular digits with a small tracked unit, used for every time), **label** (12px bold caps, tracked .08em, muted), and **body** (16px/14px regular). Section headings are labels followed by a hairline rule, like a chart legend. Headings use `text-wrap: balance`, prose `pretty`. Numbers use tabular figures so times line up. Fixed rem scale, ratio about 1.125: 12, 14, 16, 18, 22 px. No fluid type. Body measure is capped at 70ch.

## Layout

Desktop: map fills the left, a 27.5rem panel on the right that scrolls on its own. Phone: the map sits on top at 38vh (16 to 24rem) and the panel flows below it. Responsive behavior is structural, not fluid. Panel order follows the job: day, trip length, route, status, best windows, conditions, chart, safety. Spacing is the `s1` to `s6` scale; tight inside groups, generous between sections.

## Elevation & Depth

Flat. Edges are 1px borders, never stacked shadows. Interactive edges use `control` (3:1); decorative dividers use `line`. A selected card adds a 2px inset ring in `select`. The only shadow in the system is the 1px ring around the map's turn diamond.

## Shapes

Slack-band strip and legend swatches 2px, controls and chips 4px, cards 6px. Squarer than a default UI kit on purpose: it reads as a chart label plate, not a pill. Control borders are 1.5px. Icons are Phosphor, regular weight, imported per icon from `src/components/icons.js`.

## Components

- **Segmented control** (day, round trip): one frame with shared 1px dividers, like the column heads of a tide table. Day segments set a small tracked weekday over a large date numeral; trip length sets the number over a small `HR` unit. Selected = `select` fill with `on-select` text. 44px minimum height.
- **Window card**: a button. Launch and return times in large tabular digits with a small AM/PM unit (`Clock`), the slack band with a 12a/6a/12p/6p hour scale, the turn time, then chips: daylight (or which end is dark), peak current, wind. Selected state is the inset ring.
- **Status banner**: icon plus tinted field in four variants (info, ok, warn, error). Never a colored side stripe.
- **Readout**: label/value grid for current, tide, wind, plus a one-line out/return/slack callout with an icon.
- **Chart**: drawn in real pixels so labels stay readable; drag to scrub the time; "now" marker; high and low tide labels.
- **Theme toggle**: cycles match system, light, dark; persisted.
- **Map**: NOAA Nautical Chart is the default base layer (512px tiles, retried with back-off because the NOAA service intermittently returns an HTML error page). OpenStreetMap and optional ArcGIS layers are alternates. Inlets get a dashed magenta approximate danger ring.

## Do's and Don'ts

### Do:
- Keep every tap target at 44px or more and every focus ring visible.
- Say what failed and what to do next in errors.
- Add a token and a pair to `tokens.test.js` together.
- Label estimates as estimates.

### Voice

Mariner's vocabulary, used the same way everywhere: **Launch**, **Turn**, **Return**, **slack**, **flood**, **ebb**. Short imperatives for safety. Say which end is dark. Errors say what failed and what it means. No em dashes, no assistant phrasing ("Current is pushing you along...", "Before you go").

### Don't:
- Use emoji or glyphs as icons, or mix icon families.
- Use colored side-stripe borders, gradient text, glass, or decorative motion.
- Hard-code hex values in components. The exceptions are the fixed chart colors in `MapView.jsx` and the map overrides at the end of `styles.css`, which mirror the tokens.
- Dim content with opacity to mean "less important"; it breaks contrast.
