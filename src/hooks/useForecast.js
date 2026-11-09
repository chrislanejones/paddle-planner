import { useEffect, useState } from 'react'
import { loadObserved, loadPredictions, loadWind } from '../lib/api.js'

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

// Live readings refresh every six minutes, the gauge's own reporting interval.
export function useObserved(gauge, revision) {
  const [result, setResult] = useState({ status: 'loading', data: [] })
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 6 * 60_000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!gauge) return undefined
    const controller = new AbortController()
    setResult(previous => ({ status: previous.data.length ? 'ready' : 'loading', data: previous.data }))
    loadObserved(gauge, controller.signal)
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 'error', data: [] }) })
    return () => controller.abort()
  }, [gauge, revision, tick])
  return result
}
