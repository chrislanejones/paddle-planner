import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8')

function block(opening) {
  const start = css.indexOf(opening)
  assert.notEqual(start, -1, `missing ${opening}`)
  const open = css.indexOf('{', start)
  let depth = 0
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++
    if (css[i] === '}' && --depth === 0) return css.slice(open + 1, i)
  }
  throw new Error(`unterminated ${opening}`)
}
const colors = body => Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map(m => [m[1], m[2].toLowerCase()]))

const luminance = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const light = colors(block(':root {'))
const darkMedia = colors(block(':root:not([data-theme=\'light\'])'))
const darkAttr = colors(block(':root[data-theme=\'dark\']'))
// Dark overrides only what changes; everything else inherits the light value.
const dark = { ...light, ...darkAttr }

// [foreground, background, minimum ratio]: 4.5 for text, 3 for control edges and graphics.
const PAIRS = [
  ['ink', 'card', 4.5], ['ink', 'panel', 4.5], ['ink', 'ground', 4.5],
  ['mute', 'card', 4.5], ['mute', 'panel', 4.5], ['mute', 'ground', 4.5],
  ['on-header', 'header', 4.5], ['on-select', 'select', 4.5],
  ['out', 'card', 4.5], ['out', 'panel', 4.5],
  ['back', 'card', 4.5], ['back', 'panel', 4.5],
  ['slack', 'card', 4.5], ['slack', 'panel', 4.5],
  ['hazard', 'card', 4.5], ['hazard', 'panel', 4.5],
  ['tide', 'card', 4.5], ['current', 'card', 4.5],
  ['control', 'night', 3], ['night', 'card', 1.1],
  ['ink', 'tint-info', 4.5], ['ink', 'tint-ok', 4.5], ['ink', 'tint-warn', 4.5], ['ink', 'tint-error', 4.5],
  ['control', 'card', 3], ['control', 'panel', 3],
  ['focus', 'card', 3], ['focus', 'panel', 3], ['focus-on-dark', 'header', 3],
]

for (const [name, theme] of [['light', light], ['dark', dark]]) {
  test(`${name} theme meets WCAG contrast for every token pair`, () => {
    const failures = PAIRS.flatMap(([fg, bg, min]) => {
      assert.ok(theme[fg] && theme[bg], `${name}: token ${fg} or ${bg} is missing`)
      const r = ratio(theme[fg], theme[bg])
      return r >= min ? [] : [`${fg} on ${bg} = ${r.toFixed(2)}:1 (needs ${min}:1)`]
    })
    assert.deepEqual(failures, [])
  })
}

test('the two dark blocks declare identical colors', () => {
  assert.deepEqual(darkMedia, darkAttr)
})
