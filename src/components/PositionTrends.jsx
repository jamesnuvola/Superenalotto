import { useMemo } from 'react'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import Sparkline from './Sparkline'
import './PositionTrends.css'

const LOOKBACK = 10

// Calcola, per ogni posizione, il rank reale e il numero reale nelle ultime
// LOOKBACK estrazioni — usando SOLO le estrazioni precedenti per ogni punto
// (stesso principio del backtest: mai guardare avanti).
function computeTrails(draws) {
  const n = draws.length
  const startIdx = Math.max(1, n - LOOKBACK)
  const trails = POSITION_LABELS.map(() => ({ ranks: [], numbers: [], dates: [], poolSizes: [] }))

  for (let t = startIdx; t < n; t++) {
    const history = draws.slice(0, t)
    for (let p = 0; p < 6; p++) {
      const actual = draws[t][2][p]
      const { rank, poolSize } = actualRank(history, p, actual)
      trails[p].ranks.push(rank)
      trails[p].numbers.push(actual)
      trails[p].poolSizes.push(poolSize)
      trails[p].dates.push(draws[t][0])
    }
  }
  return trails
}

export default function PositionTrends({ draws }) {
  const trails = useMemo(() => computeTrails(draws), [draws])

  return (
    <div className="position-trends">
      <h2>📈 Andamento per posizione (ultime {LOOKBACK} estrazioni)</h2>
      <p className="trends-caption">
        In alto: dove si è classificato il numero vero nella lista dei candidati (più in alto = più atteso).
        In basso: il numero effettivamente estratto in quella posizione.
      </p>
      <div className="trends-grid">
        {POSITION_LABELS.map((label, p) => {
          const trail = trails[p]
          const lastDate = trail.dates[trail.dates.length - 1]
          const lastRank = trail.ranks[trail.ranks.length - 1]
          const lastPool = trail.poolSizes[trail.poolSizes.length - 1]
          return (
            <div className="trend-card" key={label}>
              <div className="trend-card-header">
                <span className="trend-position">{label}</span>
                <span className="trend-last">
                  ultimo rank {lastRank}/{lastPool}
                </span>
              </div>
              <div className="trend-chart-label">Rank (↑ meglio)</div>
              <Sparkline values={trail.ranks} labels={trail.dates} color="#00d4ff" invertY={true} yMin={1} />
              <div className="trend-chart-label">Numero estratto</div>
              <Sparkline values={trail.numbers} labels={trail.dates} color="#ff6b9d" yMin={1} yMax={90} />
              <div className="trend-dates">
                <span>{trail.dates[0]}</span>
                <span>{lastDate}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
