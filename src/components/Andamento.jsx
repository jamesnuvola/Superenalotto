import { useMemo } from 'react'
import { v, P, JOLLY_COLOR, styles, MONO } from '../utils/theme'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import Sparkline from './Sparkline'

const LOOKBACK = 10
const ETICHETTE = [...POSITION_LABELS, 'Jolly']
const COLORS = [...P, JOLLY_COLOR]

function jollyHistory(draws) {
  return draws.map(d => [d[0], d[1], [d[3]]])
}

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
      trails[p].ranks.push(rank); trails[p].numbers.push(actual)
      trails[p].poolSizes.push(poolSize); trails[p].dates.push(draws[t][0])
    }
    const ja = draws[t][3]
    const { rank: jr, poolSize: jp } = actualRank(jHistory.slice(0, t), 0, ja)
    trails[6].ranks.push(jr); trails[6].numbers.push(ja)
    trails[6].poolSizes.push(jp); trails[6].dates.push(draws[t][0])
  }
  return trails
}

export default function Andamento({ draws }) {
  const trails = useMemo(() => computeTrails(draws), [draws])

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Andamento — ultime {LOOKBACK} estrazioni</h2>
        <p style={styles.caption}>
          In alto: dove si è classificato il numero vero nella lista dei candidati (più in alto = più
          atteso). In basso: il numero effettivamente estratto. Il Jolly è trattato come una posizione
          indipendente dallo stesso motore.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {ETICHETTE.map((label, p) => {
            const tr = trails[p]
            const lastRank = tr.ranks[tr.ranks.length - 1]
            const lastPool = tr.poolSizes[tr.poolSizes.length - 1]
            return (
              <div key={label} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontFamily: MONO, color: COLORS[p], fontWeight: 700 }}>
                    {label === 'Jolly' ? 'Jolly' : label}
                  </span>
                  <span style={{ fontSize: 11, color: v.muted, fontFamily: MONO }}>ultimo rank {lastRank}/{lastPool}</span>
                </div>
                <div style={{ fontSize: 10, color: v.dim, marginBottom: 2 }}>Rank (↑ meglio)</div>
                <Sparkline values={tr.ranks} labels={tr.dates} color={v.accent} invertY yMin={1} />
                <div style={{ fontSize: 10, color: v.dim, margin: '6px 0 2px' }}>Numero estratto</div>
                <Sparkline values={tr.numbers} labels={tr.dates} color={COLORS[p]} yMin={1} yMax={90} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: v.muted, marginTop: 4, fontFamily: MONO }}>
                  <span>{tr.dates[0]}</span><span>{tr.dates[tr.dates.length - 1]}</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
