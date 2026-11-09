import { useEffect, useState } from 'react'
import { loadPredictions, loadWind } from '../lib/api.js'

export function useForecast(tideStation, station, days, revision) {
  const [result, setResult] = useState({ status: 'loading', data: null, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    setResult({ status: 'loading', data: null, error: '' })
    loadPredictions({ tideStation, station, days, signal: controller.signal, refresh: revision > 0 })
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data, error: '' }) })
      .catch(error => { if (!controller.signal.aborted) setResult({ status: 'error', data: null, error: error.message }) })
    return () => controller.abort()
  }, [tideStation, station, days, revision])
  return result
}

export function useWind(mid, revision) {
  const [result, setResult] = useState({ status: 'loading', data: [] })
  useEffect(() => {
    const controller = new AbortController()
    setResult({ status: 'loading', data: [] })
    loadWind(mid, controller.signal, revision > 0)
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 'error', data: [] }) })
    return () => controller.abort()
  }, [mid, revision])
  return result
}
