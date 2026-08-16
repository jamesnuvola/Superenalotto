import { v, P, MONO } from '../utils/constants'

// Grafico a griglia 1–90 fedele al vecchio index: una linea tratteggiata per
// serie (P1→P6), punti con etichetta del valore estratto e, sotto, il rank.
// Riutilizzato da Andamento (asse x = date, 6 serie + Jolly) e da Componi
// (asse x = P1..P6, una sola serie che si riempie a ogni numero inserito).
//
// Props:
//  width, height      dimensioni SVG (default come l'originale)
//  xLabels            etichette asse x (una per colonna)
//  lines              [{ color, values:[n|null], ranks?:[n|null], dash, width, opacity, showLabels }]
//  jolly              { values:[n|null] } opzionale, reso a rombi
//  legend             true/false

const W_DEF = 860
const H_DEF = 420
const MARGIN = { left: 34, right: 34, top: 22, bottom: 34 }

export default function PosizioniChart({
  xLabels = [],
  lines = [],
  jolly = null,
  width = W_DEF,
  height = H_DEF,
  legend = true
}) {
  const n = xLabels.length
  const gridVals = [1, 15, 30, 45, 60, 75, 90]

  // x per colonna i, y per valore 1..90
  const tx = i => (n <= 1 ? MARGIN.left + (W_DEF - MARGIN.left - MARGIN.right) / 2 : MARGIN.left + (i / (n - 1)) * (width - MARGIN.left - MARGIN.right))
  const cy = val => height - MARGIN.bottom - ((val - 1) / 89) * (height - MARGIN.top - MARGIN.bottom)

  const polyPoints = values =>
    values
      .map((val, i) => (val == null ? null : `${tx(i)},${cy(val)}`))
      .filter(Boolean)
      .join(' ')

  return (
    <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 8, padding: 8, overflowX: 'auto' }}>
      <svg width={width} height={height} style={{ display: 'block', minWidth: width }}>
        {/* griglia orizzontale + etichette valore */}
        {gridVals.map(val => (
          <g key={val}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={cy(val)} y2={cy(val)} stroke={v.border} strokeWidth={1} />
            <text x={6} y={cy(val) + 4} fill={v.dim} fontSize={10} fontFamily={MONO}>{val}</text>
          </g>
        ))}

        {/* etichette asse x */}
        {xLabels.map((lab, i) =>
          (i % 2 === 0 || n <= 8) ? (
            <text key={i} x={tx(i)} y={height - 10} fill={v.dim} fontSize={9} fontFamily={MONO} textAnchor="middle">{lab}</text>
          ) : null
        )}

        {/* linea Jolly (sotto, tenue) */}
        {jolly && (
          <polyline points={polyPoints(jolly.values)} fill="none" stroke={v.text} strokeWidth={1} strokeDasharray="2,3" opacity={0.5} />
        )}

        {/* linee delle serie */}
        {lines.map((ln, li) => (
          <polyline
            key={li}
            points={polyPoints(ln.values)}
            fill="none"
            stroke={ln.color}
            strokeWidth={ln.width ?? 1.5}
            strokeDasharray={ln.dash ?? '5,4'}
            opacity={ln.opacity ?? 0.85}
          />
        ))}

        {/* punti + etichette (numero sopra, rank sotto) */}
        {lines.map((ln, li) =>
          ln.values.map((val, i) => {
            if (val == null) return null
            const x = tx(i), y = cy(val)
            const rank = ln.ranks ? ln.ranks[i] : null
            return (
              <g key={`${li}-${i}`}>
                <circle cx={x} cy={y} r={3.5} fill={ln.color} />
                {ln.showLabels !== false && (
                  <text x={x} y={y - 7} fill={ln.color} fontSize={10} fontFamily={MONO} fontWeight={600} textAnchor="middle">{val}</text>
                )}
                {rank != null && (
                  <text x={x} y={y + 13} fill={v.muted} fontSize={8} fontFamily={MONO} textAnchor="middle">r{rank}</text>
                )}
              </g>
            )
          })
        )}

        {/* marcatori Jolly a rombo */}
        {jolly && jolly.values.map((val, i) => {
          if (val == null) return null
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
