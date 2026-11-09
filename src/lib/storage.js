export const storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return null }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch { return false }
  },
  remove(key) {
    try {
      localStorage.removeItem(key)
      return true
    } catch { return false }
  },
}

export function savedRoute() {
  const route = storage.get('pp_custom_route')
  if (!Array.isArray(route?.pts) || route.pts.length < 2) return null
  if (!route.pts.every(point => Array.isArray(point) && point.length === 2 &&
    point.every(Number.isFinite) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180)) return null
  return { id: 'custom', name: 'My route', pts: route.pts }
}
