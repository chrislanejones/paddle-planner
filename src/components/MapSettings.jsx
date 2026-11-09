import { useState } from 'react'
import { storage } from '../lib/storage.js'

export default function MapSettings({ hasKey, onChange }) {
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')

  const save = e => {
    e?.preventDefault()
    const key = draft.trim()
    if (!key) return
    storage.set('pp_arcgis_key', key)
    storage.set('pp_basemap', 'ArcGIS Navigation')
    setDraft('')
    setMessage('Saved. ArcGIS basemaps on. If tiles stay blank, check the key has the Basemaps privilege and allows this site as a referrer.')
    onChange()
  }
  const clear = () => {
    storage.remove('pp_arcgis_key')
    storage.set('pp_basemap', 'OpenStreetMap')
    setMessage('Cleared. Using OpenStreetMap.')
    onChange()
  }

  return (
    <details className="hint settings">
      <summary>Map settings (ArcGIS basemaps)</summary>
      <p>Paste an ArcGIS Location Platform <b>API key</b> (not the client ID or client secret) with the Basemaps privilege. It is saved only in this browser.</p>
      <form className="key-row" onSubmit={save}>
        <input type="password" placeholder="AAPT… API key" autoComplete="new-password" aria-label="ArcGIS API key"
          value={draft} onChange={e => setDraft(e.target.value)} />
        <button type="submit">Save</button>
        <button type="button" onClick={clear}>Clear</button>
      </form>
      <div role="status" className="hint">{message || (hasKey ? 'ArcGIS basemaps on. Use the layers button on the map to switch.' : 'Using OpenStreetMap.')}</div>
    </details>
  )
}
