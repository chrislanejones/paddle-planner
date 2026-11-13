// Keeps count of the map tiles on screen so the page can show a progress bar. A tile is loading, waiting on a retry
// (the NOAA server drops about one request in eight), loaded, or given up on. Loaded tiles are forgotten once
// everything has settled, so the next pan starts a fresh count instead of a bar stuck at 60%.
export const MAX_TILE_RETRIES = 6

export function createTileTracker(maxRetries = MAX_TILE_RETRIES) {
  const tiles = new Map()
  return {
    start: tile => { tiles.set(tile, 'loading') },
    done: tile => { tiles.set(tile, 'ok') },
    // A tile with no retry count belongs to a layer that never retries, so its first error is final.
    error: tile => { tiles.set(tile, (tile.retries ?? maxRetries + 1) > maxRetries ? 'failed' : 'retry') },
    unload: tile => { tiles.delete(tile) },
    clear: () => tiles.clear(),
    summary() {
      let loading = 0, retrying = 0, failed = 0, done = 0
      tiles.forEach(state => {
        if (state === 'loading') loading += 1
        else if (state === 'retry') retrying += 1
        else if (state === 'failed') failed += 1
        else done += 1
      })
      const pending = loading + retrying
      const result = { total: pending + done, done, pending, retrying, failed }
      if (!pending) tiles.forEach((state, tile) => { if (state === 'ok') tiles.delete(tile) })
      return result
    },
  }
}
