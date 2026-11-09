import { useEffect, useState } from 'react'
import { storage } from '../lib/storage.js'
import { CircleHalf, Moon, Sun } from './icons.js'

const MODES = ['auto', 'light', 'dark']
const ICONS = { auto: CircleHalf, light: Sun, dark: Moon }
const LABELS = { auto: 'Match system', light: 'Light', dark: 'Dark' }

// Light is the designed-first theme; "auto" follows the system so pre-dawn launches get dark.
export default function ThemeToggle() {
  const [mode, setMode] = useState(() => (MODES.includes(storage.get('pp_theme')) ? storage.get('pp_theme') : 'auto'))
  useEffect(() => {
    const root = document.documentElement
    if (mode === 'auto') root.removeAttribute('data-theme')
    else root.dataset.theme = mode
    storage.set('pp_theme', mode)
  }, [mode])
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length]
  const Icon = ICONS[mode]
  return (
    <button type="button" className="theme-toggle" onClick={() => setMode(next)}
      aria-label={`Theme: ${LABELS[mode]}. Switch to ${LABELS[next]}.`}>
      <Icon size={20} aria-hidden="true" />
      <span>{LABELS[mode]}</span>
    </button>
  )
}
