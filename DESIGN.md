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
  dark-panel: "#0c2130"
  dark-card: "#11303f"
  dark-ink: "#e7f1f6"
  dark-select: "#cfe8f5"
typography:
  body:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  card-title:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  label:
    fontFamily: "Atkinson Hyperlegible Next Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
rounded:
  sm: "8px"
  md: "12px"
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

### Named Rules

- **Contrast is tested.** Every text/surface pair is at least 4.5:1 and every control edge at least 3:1, in both themes, by `src/lib/tokens.test.js`. Change a token and the build tells you.
- **Color never works alone.** State always pairs color with an icon or text.

## Typography

One family: Atkinson Hyperlegible Next (variable), self-hosted. It was designed for legibility, which is the point for glare and small phone screens. Numbers use tabular figures so times line up. Fixed rem scale, ratio about 1.125: 12, 14, 16, 18, 22 px. No fluid type. Body measure is capped at 70ch.

## Layout

Desktop: map fills the left, a 27.5rem panel on the right that scrolls on its own. Phone: the map sits on top at 38vh (16 to 24rem) and the panel flows below it. Responsive behavior is structural, not fluid. Panel order follows the job: day, trip length, route, status, best windows, conditions, chart, safety. Spacing is the `s1` to `s6` scale; tight inside groups, generous between sections.

## Elevation & Depth

Flat. Edges are 1px borders, never stacked shadows. Interactive edges use `control` (3:1); decorative dividers use `line`. A selected card adds a 2px inset ring in `select`. The only shadow in the system is the 1px ring around the map's turn diamond.

## Shapes

Controls 8px radius, cards 12px, small pills for chips only. Icons are Phosphor, regular weight, imported per icon from `src/components/icons.js`.

## Components

- **Chip group** (day, trip length): equal-width single-choice buttons, 44px minimum height. Selected = `select` fill with `on-select` text.
- **Window card**: a button. Time range, slack band strip, turn time, then chips (daylight, peak current, wind). Selected state is the inset ring.
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

### Don't:
- Use emoji or glyphs as icons, or mix icon families.
- Use colored side-stripe borders, gradient text, glass, or decorative motion.
- Hard-code hex values in components. The exceptions are the fixed chart colors in `MapView.jsx` and the map overrides at the end of `styles.css`, which mirror the tokens.
- Dim content with opacity to mean "less important"; it breaks contrast.
