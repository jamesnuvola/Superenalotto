import { useMemo } from 'react'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import Sparkline from './Sparkline'
import './PositionTrends.css'

const LOOKBACK = 10
const ETICHETTE = [...POSITION_LABELS, 'Jolly']

// Storico riformattato per far vedere il Jolly allo stesso motore di rank,
// trattandolo come una posizione singola indipendente: [data, concorso, [jolly]].
// Inline qui (invece che nel motore) perché serve solo a questa vista.
function jollyHistory(draws) {
  return draws.map(d => [d[0], d[1], [d[3]]])
}

// Calcola, per ogni posizione (P1-P6) e per il Jolly, il rank reale e il
// numero reale nelle ultime LOOKBACK estrazioni — sempre walk-forward
// (solo estrazioni precedenti), stesso principio del backtest.
function computeTrails(draws) {
  const n = draws.length
  const startIdx = Math.max(1, n - LOOKBACK)
  const trails = ETICHETTE.map(() => ({ ranks: [], numbers: [], dates: [], poolSizes: [] }))
  const jHistory = jollyHistory(draws)

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
    // Jolly: stesso motore di scoring, applicato al Jolly come posizione indipendente
    const jollyActual = draws[t][3]
    const { rank: jRank, poolSize: jPool } = actualRank(jHistory.slice(0, t), 0, jollyActual)
    trails[6].ranks.push(jRank)
    trails[6].numbers.push(jollyActual)
    trails[6].poolSizes.push(jPool)
    trails[6].dates.push(draws[t][0])
  }
  return trails
}

export default function Andamento({ draws }) {
  const trails = useMemo(() => computeTrails(draws), [draws])

  return (
    <div className="position-trends">
      <h2>📈 Andamento (ultime {LOOKBACK} estrazioni)</h2>
      <p className="trends-caption">
        In alto: dove si è classificato il numero vero nella lista dei candidati (più in alto = più atteso).
        In basso: il numero effettivamente estratto. Il Jolly è trattato dallo stesso motore come una
        posizione indipendente (non fa parte delle 6 posizioni ordinate della sestina).
      </p>
      <div className="trends-grid">
        {ETICHETTE.map((label, p) => {
          const trail = trails[p]
          const lastDate = trail.dates[trail.dates.length - 1]
          const lastRank = trail.ranks[trail.ranks.length - 1]
          const lastPool = trail.poolSizes[trail.poolSizes.length - 1]
          return (
            <div className="trend-card" key={label}>
              <div className="trend-card-header">
                <span className="trend-position">{label === 'Jolly' ? '🎯 Jolly' : label}</span>
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
