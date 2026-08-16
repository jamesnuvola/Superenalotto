// Costruisce columns + lines per PosizioniChart: 15 estrazioni reali + 1
// colonna futura con la sestina proiettata (numeri per posizione + rank).
// futureNums / futureRanks: array di 6 (null ammesso, per l'inserimento parziale).
import { P } from '../utils/constants'
import { POSITION_LABELS } from '../engine/scoring'

export function buildProjection(hs, futureLabel, futureNums, futureRanks) {
  const columns = [...hs.dates.map(d => ({ label: d })), { label: futureLabel, future: true }]
  const lines = POSITION_LABELS.map((label, p) => ({
    label,
    color: P[p],
    values: [...hs.posValues[p], futureNums[p] ?? null],
    ranks: [...hs.posRanks[p], futureRanks[p] ?? null]
  }))
  const jolly = { values: [...hs.jollyValues, null] }
  return { columns, lines, jolly }
}
