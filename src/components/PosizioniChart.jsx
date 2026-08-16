import { v, MONO } from '../utils/constants'
import { actualRank } from '../engine/scoring'

// Grafico a griglia 1–90 fedele al vecchio index, con supporto alla COLONNA
// FUTURA: le linee P1→P6 delle ultime estrazioni si prolungano fino a una
// colonna extra (la prossima data stimata) dove atterrano i numeri proiettati
// per posizione — così si vede come il grafico "si sposterebbe".
//
// Props:
//  columns   [{ label, future? }]      colonne asse x (l'ultima con future:true)
//  lines     [{ color, label, values:[n|null], ranks?:[n|null] }]  values allineati a columns
//  jolly     { values:[n|null] }        opzionale (niente proiezione sul jolly)
//  height    altezza SVG (usa 200 per la versione compatta/sticky)
//  legend    true/false

const W = 860
const H_DEF = 420
const M = { left: 34, right: 34, top: 22, bottom: 34 }

// Stima la prossima data di estrazione dal ritmo reale delle ultime estrazioni.
export function stimaProssimaData(draws) {
  const parse = s => { const [g, m, a] = s.split('/').map(Number); return new Date(a, m - 1, g) }
  const fmt = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  const recent = draws.slice(-9).map(d => parse(d[0]))
  const gaps = []
  for (let i = 1; i < recent.length; i++) gaps.push(Math.round((recent[i] - recent[i - 1]) / 86400000))
  gaps.sort((a, b) => a - b)
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 2
  const last = parse(draws[draws.length - 1][0])
  const next = new Date(last.getTime() + Math.max(1, median) * 86400000)
  return fmt(next)
}

// Serie storiche (ultime `lookback` estrazioni) pronte per il grafico:
// per ogni posizione P1..P6 il numero estratto e il rank walk-forward, più
// il Jolly. Restituisce anche le colonne (date) già formattate.
export function historicalSeries(draws, lookback = 15) {
  const n = draws.length
  const startIdx = Math.max(1, n - lookback)
  const jHist = draws.map(d => [d[0], d[1], [d[3]]])
  const dates = []
  const posValues = [[], [], [], [], [], []]
  const posRanks = [[], [], [], [], [], []]
  const jollyValues = []
  for (let t = startIdx; t < n; t++) {
    const history = draws.slice(0, t)
    dates.push(draws[t][0].slice(0, 5))
    for (let p = 0; p < 6; p++) {
      const num = draws[t][2][p]
      posValues[p].push(num)
      posRanks[p].push(actualRank(history, p, num).rank)
    }
    jollyValues.push(draws[t][3])
  }
  return { dates, posValues, posRanks, jollyValues }
}

export default function PosizioniChart({ columns = [], lines = [], jolly = null, height = H_DEF, legend = true }) {
  const n = columns.length
  const futureIdx = columns.findIndex(c => c.future)
  const gridVals = [1, 15, 30, 45, 60, 75, 90]

  const tx = i => (n <= 1 ? M.left + (W - M.left - M.right) / 2 : M.left + (i / (n - 1)) * (W - M.left - M.right))
  const cy = val => height - M.bottom - ((val - 1) / 89) * (height - M.top - M.bottom)

  const dividerX = futureIdx > 0 ? (tx(futureIdx - 1) + tx(futureIdx)) / 2 : null

  // punti reali (colonne non-future) per la polyline tratteggiata
  const realPoly = values =>
    values
      .map((val, i) => (!columns[i].future && val != null ? `${tx(i)},${cy(val)}` : null))
      .filter(Boolean)
      .join(' ')

  const lastRealPoint = values => {
    for (let i = (futureIdx === -1 ? n : futureIdx) - 1; i >= 0; i--) {
      if (values[i] != null) return { x: tx(i), y: cy(values[i]) }
    }
    return null
  }

  return (
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 8, padding: 8, overflowX: 'auto' }}>
      <svg width={W} height={height} style={{ display: 'block', minWidth: W }}>
        {/* griglia orizzontale + valori */}
        {gridVals.map(val => (
          <g key={val}>
            <line x1={M.left} x2={W - M.right} y1={cy(val)} y2={cy(val)} stroke={v.border} strokeWidth={1} />
            <text x={6} y={cy(val) + 4} fill={v.dim} fontSize={10} fontFamily={MONO}>{val}</text>
          </g>
        ))}

        {/* separatore + banda colonna futura */}
        {dividerX != null && (
          <g>
            <rect x={dividerX} y={M.top - 6} width={W - M.right - dividerX} height={height - M.top - M.bottom + 6} fill={v.accent} opacity={0.05} />
            <line x1={dividerX} x2={dividerX} y1={M.top - 6} y2={height - M.bottom} stroke={v.accent} strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
          </g>
        )}

        {/* etichette asse x */}
        {columns.map((c, i) =>
          (c.future || i % 2 === 0 || n <= 8) ? (
            <text key={i} x={tx(i)} y={height - 10} fill={c.future ? v.accent : v.dim} fontSize={c.future ? 10 : 9} fontFamily={MONO} fontWeight={c.future ? 700 : 400} textAnchor="middle">
              {c.label}
            </text>
          ) : null
        )}

        {/* jolly (tenue, solo storico) */}
        {jolly && (
          <polyline points={realPoly(jolly.values)} fill="none" stroke={v.text} strokeWidth={1} strokeDasharray="2,3" opacity={0.5} />
        )}

        {/* linee: storico tratteggiato + segmento di proiezione pieno */}
        {lines.map((ln, li) => {
          const fv = futureIdx >= 0 ? ln.values[futureIdx] : null
          const lrp = lastRealPoint(ln.values)
          return (
            <g key={li}>
              <polyline points={realPoly(ln.values)} fill="none" stroke={ln.color} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.85} />
              {fv != null && lrp && (
                <line x1={lrp.x} y1={lrp.y} x2={tx(futureIdx)} y2={cy(fv)} stroke={ln.color} strokeWidth={2} opacity={1} />
              )}
            </g>
          )
        })}

        {/* punti + etichette (numero sopra, rank sotto) */}
        {lines.map((ln, li) =>
          ln.values.map((val, i) => {
            if (val == null) return null
            const x = tx(i), y = cy(val)
            const rank = ln.ranks ? ln.ranks[i] : null
            const isFuture = columns[i].future
            return (
              <g key={`${li}-${i}`}>
                <circle cx={x} cy={y} r={isFuture ? 4.5 : 3.5} fill={ln.color} stroke={isFuture ? v.text : 'none'} strokeWidth={isFuture ? 1 : 0} />
                <text x={x} y={y - 7} fill={ln.color} fontSize={isFuture ? 11 : 10} fontFamily={MONO} fontWeight={isFuture ? 700 : 600} textAnchor="middle">{val}</text>
                {rank != null && (
                  <text x={x} y={y + 13} fill={v.muted} fontSize={8} fontFamily={MONO} textAnchor="middle">r{rank}</text>
                )}
              </g>
            )
          })
        )}

        {/* marcatori jolly a rombo (solo storico) */}
        {jolly && jolly.values.map((val, i) => {
          if (val == null || columns[i].future) return null
          const x = tx(i), y = cy(val)
          return (
            <g key={`j-${i}`}>
              <rect x={x - 3} y={y - 3} width={6} height={6} fill={v.bg} stroke={v.text} strokeWidth={1} transform={`rotate(45 ${x} ${y})`} />
              <text x={x} y={y - 8} fill={v.text} fontSize={9} fontFamily={MONO} textAnchor="middle">{val}</text>
            </g>
          )
        })}
      </svg>

      {legend && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 10 }}>
          {lines.map((ln, li) => (
            <div key={li} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: ln.color, display: 'inline-block' }} />
              <span style={{ fontSize: 11, color: v.muted, fontFamily: MONO }}>{ln.label ?? `S${li + 1}`}</span>
            </div>
          ))}
          {jolly && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, background: v.bg, border: `1px solid ${v.text}`, display: 'inline-block', transform: 'rotate(45deg)' }} />
              <span style={{ fontSize: 11, color: v.muted, fontFamily: MONO }}>Jolly</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
