import { useMemo } from 'react'
import { v, P, styles, MONO } from '../utils/constants'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import PosizioniChart from './PosizioniChart'

const LOOKBACK = 15

function jollyHistory(draws) {
  return draws.map(d => [d[0], d[1], [d[3]]])
}

// Ultime LOOKBACK estrazioni in ordine cronologico (sx→dx).
// Per ogni posizione P1..P6 e per il Jolly: numero estratto + rank walk-forward.
function computeSeries(draws) {
  const n = draws.length
  const startIdx = Math.max(1, n - LOOKBACK)
  const jHistory = jollyHistory(draws)

  const dates = []
  const posValues = [[], [], [], [], [], []]
  const posRanks = [[], [], [], [], [], []]
  const jollyValues = []

  for (let t = startIdx; t < n; t++) {
    const history = draws.slice(0, t)
    dates.push(draws[t][0].slice(0, 5)) // dd/mm
    for (let p = 0; p < 6; p++) {
      const num = draws[t][2][p]
      posValues[p].push(num)
      posRanks[p].push(actualRank(history, p, num).rank)
    }
    jollyValues.push(draws[t][3])
  }
  return { dates, posValues, posRanks, jollyValues }
}

export default function Andamento({ draws }) {
  const { dates, posValues, posRanks, jollyValues } = useMemo(() => computeSeries(draws), [draws])

  const lines = POSITION_LABELS.map((label, p) => ({
    label,
    color: P[p],
    values: posValues[p],
    ranks: posRanks[p]
  }))

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Andamento — ultime {dates.length} estrazioni</h2>
        <p style={styles.caption}>
          Una linea tratteggiata per posizione (P1→P6, dal numero più basso al più alto in ogni
          estrazione). Sopra ogni punto il numero estratto, sotto il suo rank (posizione nella
          classifica dei candidati, walk-forward). Il Jolly è marcato a parte, a rombi.
        </p>
        <PosizioniChart
          xLabels={dates}
          lines={lines}
          jolly={{ values: jollyValues }}
        />
      </section>
    </div>
  )
}
