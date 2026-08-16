import { useMemo, useState } from 'react'
import { v, P, styles, ballStyle, MONO } from '../utils/constants'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import { bandaDiRank } from '../engine/dominant-band'
import PosizioniChart from './PosizioniChart'

function parseDataIT(s) { const [g, m, a] = s.split('/').map(Number); return { mese: m, anno: a } }

function usciteMese(draws, num) {
  const now = new Date(), m = now.getMonth() + 1, a = now.getFullYear()
  return draws.filter(d => { const { mese, anno } = parseDataIT(d[0]); return mese === m && anno === a && d[2].includes(num) }).length
}
function distanza(draws, position, num) {
  for (let i = draws.length - 1; i >= 0; i--) if (draws[i][2][position] === num) return draws.length - 1 - i
  return null
}

export default function Componi({ draws }) {
  const [inputs, setInputs] = useState(['', '', '', '', '', ''])

  const numeri = inputs.map(x => parseInt(x, 10))
  const validi = numeri.every(n => Number.isInteger(n) && n >= 1 && n <= 90)
  const duplicati = validi && new Set(numeri).size !== 6

  // Numeri validi inseriti finora (anche parziali), ordinati crescenti:
  // ogni numero occupa la prossima posizione P1..Pk. Così il grafico si
  // "compila" a ogni numero digitato, coerente col motore (posizione = ordine crescente).
  const parziale = useMemo(() => {
    const vals = numeri.filter(n => Number.isInteger(n) && n >= 1 && n <= 90).sort((a, b) => a - b)
    const values = new Array(6).fill(null)
    const ranks = new Array(6).fill(null)
    vals.slice(0, 6).forEach((num, p) => {
      values[p] = num
      ranks[p] = actualRank(draws, p, num).rank
    })
    return { values, ranks }
  }, [numeri.join(','), draws])

  const ordinati = validi && !duplicati ? [...numeri].sort((a, b) => a - b) : null

  const dettaglio = useMemo(() => {
    if (!ordinati) return null
    const atteso = (draws.length * 6) / 90
    return ordinati.map((num, p) => {
      const { rank, poolSize } = actualRank(draws, p, num)
      const u = usciteMese(draws, num)
      return { p, num, rank, poolSize, banda: bandaDiRank(rank), uscite: u, sorpresa: u - atteso, dist: distanza(draws, p, num) }
    })
  }, [ordinati, draws])

  const change = (i, val) => { const nx = [...inputs]; nx[i] = val.replace(/[^0-9]/g, ''); setInputs(nx) }
  const almenoUno = parziale.values.some(x => x != null)

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Componi la tua sestina</h2>
        <p style={styles.caption}>
          Inserisci 6 numeri (1–90, tutti diversi). Vengono valutati in ordine crescente — lo stesso
          ordine con cui il motore osserva P1→P6. Il grafico aggiunge un punto a ogni numero, col
          valore sopra e il rank sotto.
        </p>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          {inputs.map((val, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: v.muted, marginBottom: 4 }}>N. {i + 1}</div>
              <input
                type="text" inputMode="numeric" maxLength={2} value={val}
                onChange={e => change(i, e.target.value)}
                style={{ width: 52, padding: 8, textAlign: 'center', fontSize: 16, borderRadius: 8, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO }}
              />
            </div>
          ))}
        </div>

        {duplicati && <p style={{ color: v.hot, fontSize: 13 }}>I 6 numeri devono essere tutti diversi.</p>}

        {almenoUno && (
          <PosizioniChart
            xLabels={POSITION_LABELS}
            lines={[{ label: 'Sestina', color: v.accent, values: parziale.values, ranks: parziale.ranks }]}
            legend={false}
          />
        )}

        {dettaglio && (
          <>
            <div style={{ ...styles.card, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 12 }}>
              {dettaglio.map((d, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ ...ballStyle(P[i % 6], 44, 17), margin: '0 auto' }}>{d.num}</span>
                  <div style={{ fontSize: 10, color: v.muted, marginTop: 4, fontFamily: MONO }}>P{i + 1} · r{d.rank}/{d.poolSize}</div>
                </div>
              ))}
            </div>

            <div style={{ overflowX: 'auto', ...styles.card, padding: 0, marginTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: MONO }}>
                <thead>
                  <tr>
                    {['Num', 'Pos', 'Rank', 'Banda', 'Mese', 'Oss−att', 'Distanza'].map(h => (
                      <th key={h} style={{ padding: '8px 6px', color: v.muted, borderBottom: `1px solid ${v.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dettaglio.map(d => (
                    <tr key={d.p}>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: v.text }}>{d.num}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: v.muted }}>P{d.p + 1}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: v.text }}>{d.rank}/{d.poolSize}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: v.muted }}>{d.banda}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: v.text }}>{d.uscite}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: d.sorpresa >= 0 ? v.green : v.hot }}>{d.sorpresa >= 0 ? '+' : ''}{d.sorpresa.toFixed(1)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'center', color: v.muted }}>{d.dist === null ? 'mai qui' : `${d.dist} fa`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
