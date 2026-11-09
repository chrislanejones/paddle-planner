import { useMemo } from 'react'
import { lastHourSummary, valueAt } from '../lib/planner.js'
import { ArrowDownRight, ArrowUpRight, Equals } from './icons.js'

const SPARK_W = 100, SPARK_H = 28

// A tiny line of the last three hours. It only decorates: the sentence beside it carries the numbers.
function Spark({ series }) {
  const { path, fill } = useMemo(() => {
    const lo = Math.min(...series.map(r => r.v)), hi = Math.max(...series.map(r => r.v))
    const t0 = series[0].t, span = (series.at(-1).t - t0) || 1, range = hi - lo || 1
    const pts = series.map(r => `${((r.t - t0) / span * SPARK_W).toFixed(1)},${(SPARK_H - 3 - (r.v - lo) / range * (SPARK_H - 6)).toFixed(1)}`)
    return { path: `M${pts.join('L')}`, fill: `M${pts.join('L')}L${SPARK_W},${SPARK_H}L0,${SPARK_H}Z` }
  }, [series])
  return (
    <svg className="spark" viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="c-tide-fill" d={fill} /><path className="c-tide" vectorEffect="non-scaling-stroke" d={path} />
    </svg>
  )
}

const TREND = {
  rising: { Icon: ArrowUpRight, word: 'rising' },
  falling: { Icon: ArrowDownRight, word: 'falling' },
  steady: { Icon: Equals, word: 'steady' },
}

// What the water did over the last hour, from the nearest NOAA gauge that reports live levels.
export default function LastHour({ gauge, observed, tides, predictionStationId }) {
  const summary = useMemo(() => lastHourSummary(observed.data), [observed.data])

  let body
  if (!gauge) {
    body = <p className="empty">No live NOAA gauge is close enough to this route to say anything useful. The nearest ones are at Mayport and Fernandina.</p>
  } else if (observed.status === 'error') {
    body = <p className="empty">Live readings from {gauge.name} are unavailable right now.</p>
  } else if (observed.status === 'loading' && !summary) {
    body = <p className="empty">Loading the last hour from {gauge.name}…</p>
  } else if (!summary) {
    body = <p className="empty">{gauge.name} has no recent readings.</p>
  } else {
    const trend = summary.trend ? TREND[summary.trend] : null
    // Only compare with the prediction when it is the same station, otherwise the two are not alike.
    const predicted = predictionStationId === gauge.id ? valueAt(tides, summary.at) : null
    const gap = predicted == null ? null : summary.level - predicted
    body = (
      <>
        <div className="lh-main">
          <div>
            <dl className="ro-grid">
              <dt>Level</dt>
              <dd>{summary.level.toFixed(1)} ft{trend && <> · <span className="lh-trend"><trend.Icon size={16} aria-hidden="true" />{trend.word}</span>{summary.change != null && ` ${Math.abs(summary.change).toFixed(1)} ft in the last hour`}</>}</dd>
              {gap != null && (<><dt>Vs prediction</dt><dd>{Math.abs(gap) < 0.1 ? 'On the prediction' : `${Math.abs(gap).toFixed(1)} ft ${gap > 0 ? 'above' : 'below'} the prediction`}</dd></>)}
              <dt>Reading</dt><dd>{summary.ageMin <= 1 ? 'Just now' : `${summary.ageMin} min ago`}</dd>
            </dl>
          </div>
          <Spark series={summary.series} />
        </div>
        <p className="lh-source">
          {gauge.name}, {gauge.d.toFixed(gauge.d < 10 ? 1 : 0)} km away.
          {gauge.d >= 15 && ' Timing at your route can differ.'}
        </p>
      </>
    )
  }

  return (
    <div className="readout lasthour">
      <h3 className="lh-title">Last hour, measured</h3>
      {body}
    </div>
  )
}
