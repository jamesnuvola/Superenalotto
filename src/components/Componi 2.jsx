import { useMemo, useState } from 'react'
import { v, P, styles, ballStyle, MONO } from '../utils/constants'
import { actualRank, compositeScores } from '../engine/scoring'
import { bandaDiRank } from '../engine/dominant-band'
import PosizioniChart, { historicalSeries, stimaProssimaData } from './PosizioniChart'
import { buildProjection } from './proiezione'

function parseDataIT(s) { const [g, m, a] = s.split('/').map(Number); return { mese: m, anno: a } }
function usciteMese(draws, num) {
  const now = new Date(), m = now.getMonth() + 1, a = now.getFullYear()
  return draws.filter(d => { const { mese, anno } = parseDataIT(d[0]); return mese === m && anno === a && d[2].includes(num) }).length
}
function distanza(draws, position, num) {
  for (let i = draws.length - 1; i >= 0; i--) if (draws[i][2][position] === num) return draws.length - 1 - i
  return null
}

// ---- SERIA: dato P1=a e P6=b, il motore compone P2..P5 ----
// Usa lo stesso ranking del motore (composito delle 6 regole) miscelato con la
// statistica d'ordine (il guadagno +22% su hit@3, più forte agli estremi), ristretto
// ai numeri interni al range, e sceglie la combinazione crescente valida a punteggio
// massimo via programmazione dinamica. Niente equidistanza: i centrali li decidono
// le regole (decade dominante, hot, ritardo, volatilità…).
function nCk(n, k) { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r }
function ordScore(p, val) { return nCk(val - 1, p) * nCk(90 - val, 5 - p) }
const SERIA_ALPHA = [1, 0.75, 0.75, 0.75, 1, 0.75] // peso della statistica d'ordine per posizione

function seriaScoreMap(draws, p) {
  const comp = compositeScores(draws, p)
  let mx = 0; for (const val of comp.values()) if (val > mx) mx = val
  let omx = 0; for (let val = 1; val <= 90; val++) { const s = ordScore(p, val); if (s > omx) omx = s }
  const al = SERIA_ALPHA[p]
  const m = new Map()
  for (let val = 1; val <= 90; val++) {
    const cn = (comp.get(val) || 0) / (mx || 1)
    const on = ordScore(p, val) / (omx || 1)
    m.set(val, (1 - al) * cn + al * on)
  }
  return m
}

function seriaCompose(draws, a, b) {
  if (!(Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b <= 90 && b - a >= 5)) return null
  const sc = [1, 2, 3, 4].map(p => seriaScoreMap(draws, p)) // P2..P5
  const vals = []; for (let val = a + 1; val <= b - 1; val++) vals.push(val)
  const n = vals.length
  if (n < 4) return null
  const dp = Array.from({ length: 4 }, () => new Array(n).fill(-Infinity))
  const par = Array.from({ length: 4 }, () => new Array(n).fill(-1))
  for (let idx = 0; idx < n; idx++) dp[0][idx] = sc[0].get(vals[idx])
  for (let j = 1; j < 4; j++) for (let idx = 0; idx < n; idx++) {
    for (let prev = 0; prev < idx; prev++) {
      const cand = dp[j - 1][prev] + sc[j].get(vals[idx])
      if (cand > dp[j][idx]) { dp[j][idx] = cand; par[j][idx] = prev }
    }
  }
  let best = -Infinity, bi = -1
  for (let idx = 0; idx < n; idx++) if (dp[3][idx] > best) { best = dp[3][idx]; bi = idx }
  if (bi < 0) return null
  const mids = []; let j = 3, idx = bi
  while (j >= 0) { mids.unshift(vals[idx]); idx = par[j][idx]; j-- }
  return [a, ...mids, b]
}

export default function Componi({ draws }) {
  const [mode, setMode] = useState('manuale') // 'manuale' | 'seria'
  const [inputs, setInputs] = useState(['', '', '', '', '', ''])
  const [estremi, setEstremi] = useState(['', '']) // P1, P6
  const hs = useMemo(() => historicalSeries(draws, 15), [draws])
  const futureLabel = useMemo(() => stimaProssimaData(draws), [draws])

  // sestina composta dal motore (solo in modalità SERIA)
  const p1 = parseInt(estremi[0], 10), p6 = parseInt(estremi[1], 10)
  const seriaSestina = useMemo(() => {
    if (mode !== 'seria') return null
    return seriaCompose(draws, p1, p6)
  }, [mode, p1, p6, draws])

  // numeri "attivi": digitati (manuale) o composti dal motore (SERIA)
  const numeri = mode === 'seria'
    ? (seriaSestina || [NaN, NaN, NaN, NaN, NaN, NaN])
    : inputs.map(x => parseInt(x, 10))

  const validi = numeri.every(n => Number.isInteger(n) && n >= 1 && n <= 90)
  const duplicati = validi && new Set(numeri).size !== 6

  const parziale = useMemo(() => {
    const vals = numeri.filter(n => Number.isInteger(n) && n >= 1 && n <= 90).sort((a, b) => a - b)
    const values = new Array(6).fill(null)
    const ranks = new Array(6).fill(null)
    vals.slice(0, 6).forEach((num, p) => { values[p] = num; ranks[p] = actualRank(draws, p, num).rank })
    return { values, ranks }
  }, [numeri.join(','), draws])

  const proj = useMemo(() => buildProjection(hs, futureLabel, parziale.values, parziale.ranks), [hs, futureLabel, parziale])

  const ordinati = validi && !duplicati ? [...numeri].sort((a, b) => a - b) : null
  const dettaglio = useMemo(() => {
    if (!ordinati) return null
    const now = new Date(), m = now.getMonth() + 1, a = now.getFullYear()
    const nDrawsMese = draws.filter(d => { const x = parseDataIT(d[0]); return x.mese === m && x.anno === a }).length
    const attesoMese = (nDrawsMese * 6) / 90
    return ordinati.map((num, p) => {
      const { rank, poolSize } = actualRank(draws, p, num)
      const u = usciteMese(draws, num)
      return { p, num, rank, poolSize, banda: bandaDiRank(rank), uscite: u, atteso: attesoMese, sorpresa: u - attesoMese, dist: distanza(draws, p, num) }
    })
  }, [ordinati, draws])

  const change = (i, val) => { const nx = [...inputs]; nx[i] = val.replace(/[^0-9]/g, ''); setInputs(nx) }
  const changeEstremo = (i, val) => { const nx = [...estremi]; nx[i] = val.replace(/[^0-9]/g, ''); setEstremi(nx) }

  const tabBtn = (m, label) => (
    <button onClick={() => setMode(m)} style={{
      flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', fontFamily: MONO, fontSize: 13,
      border: `1px solid ${mode === m ? v.accent : v.border}`,
      background: mode === m ? `${v.accent}1a` : v.card,
      color: mode === m ? v.accent : v.muted,
    }}>{label}</button>
  )

  const estremiPronti = mode === 'seria' && Number.isInteger(p1) && Number.isInteger(p6)
  const estremiErrore = estremiPronti && !seriaSestina

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Componi la tua sestina</h2>

        <div style={{ display: 'flex', gap: 8, margin: '4px 0 12px' }}>
          {tabBtn('manuale', 'Manuale')}
          {tabBtn('seria', 'SERIA · gli estremi li scegli tu')}
        </div>

        {mode === 'manuale' ? (
          <p style={styles.caption}>
            Inserisci 6 numeri (1–90, tutti diversi). Il grafico mostra le ultime 15 estrazioni e proietta
            i tuoi numeri per posizione nella colonna futura ({futureLabel}). Ogni numero digitato prolunga la sua linea.
          </p>
        ) : (
          <p style={styles.caption}>
            Fissa <strong style={{ color: v.text }}>P1</strong> (il più basso) e <strong style={{ color: v.text }}>P6</strong> (il più alto):
            il motore compone i quattro centrali con lo stesso ranking delle 6 regole più la statistica d'ordine
            (il guadagno del +22%), ristretto al tuo range. Non spaziatura fissa — i centrali li scelgono le regole.
            Il +22% è sul ranking; il +36% arriverebbe se la tua scelta sugli estremi azzecca la forma reale.
          </p>
        )}

        {mode === 'manuale' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', margin: '14px 0' }}>
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
        )}

        {mode === 'seria' && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', margin: '14px 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: v.accent, marginBottom: 4, fontFamily: MONO }}>P1 · più basso</div>
              <input type="text" inputMode="numeric" maxLength={2} value={estremi[0]}
                onChange={e => changeEstremo(0, e.target.value)}
                style={{ width: 60, padding: 10, textAlign: 'center', fontSize: 20, borderRadius: 8, border: `1px solid ${v.accent}88`, background: v.card, color: v.accent, fontFamily: MONO }} />
            </div>
            <div style={{ color: v.muted, paddingBottom: 12, fontFamily: MONO }}>… motore …</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: v.hot, marginBottom: 4, fontFamily: MONO }}>P6 · più alto</div>
              <input type="text" inputMode="numeric" maxLength={2} value={estremi[1]}
                onChange={e => changeEstremo(1, e.target.value)}
                style={{ width: 60, padding: 10, textAlign: 'center', fontSize: 20, borderRadius: 8, border: `1px solid ${v.hot}88`, background: v.card, color: v.hot, fontFamily: MONO }} />
            </div>
          </div>
        )}

        {estremiErrore && (
          <p style={{ color: v.hot, fontSize: 13 }}>
            Servono P1 e P6 validi (1–90) con almeno 5 di distanza, per far stare i quattro centrali.
          </p>
        )}
        {duplicati && <p style={{ color: v.hot, fontSize: 13 }}>I 6 numeri devono essere tutti diversi.</p>}

        <PosizioniChart columns={proj.columns} lines={proj.lines} jolly={proj.jolly} />

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
