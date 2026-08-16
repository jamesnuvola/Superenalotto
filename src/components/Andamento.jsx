import { useMemo } from 'react'
import { P, styles } from '../utils/constants'
import { POSITION_LABELS } from '../engine/scoring'
import PosizioniChart, { historicalSeries } from './PosizioniChart'

export default function Andamento({ draws }) {
  const hs = useMemo(() => historicalSeries(draws, 15), [draws])

  const columns = hs.dates.map(d => ({ label: d }))
  const lines = POSITION_LABELS.map((label, p) => ({
    label, color: P[p], values: hs.posValues[p], ranks: hs.posRanks[p]
  }))

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Andamento — ultime {hs.dates.length} estrazioni</h2>
        <p style={styles.caption}>
          Una linea tratteggiata per posizione (P1→P6, dal numero più basso al più alto in ogni
          estrazione). Sopra ogni punto il numero estratto, sotto il suo rank. Il Jolly è a rombi.
        </p>
        <PosizioniChart columns={columns} lines={lines} jolly={{ values: hs.jollyValues }} />
      </section>
    </div>
  )
}
