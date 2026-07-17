import { useMemo, useState } from 'react'
import { rankedCandidates, POSITION_LABELS } from '../engine/scoring'
import './NumberRankTable.css'

function buildGrid(draws) {
  const grid = {}
  for (let n = 1; n <= 90; n++) grid[n] = new Array(6).fill(null)
  for (let p = 0; p < 6; p++) {
    const ranked = rankedCandidates(draws, p)
    ranked.forEach(([num], idx) => { grid[num][p] = idx + 1 })
  }
  return grid
}

// Colore di sfondo in base a quanto e' buono il rank (verde=ottimo, fino a grigio=mai visto)
function rankColor(rank) {
  if (rank === null) return 'transparent'
  if (rank <= 10) return 'rgba(0, 212, 255, 0.35)'
  if (rank <= 20) return 'rgba(0, 212, 255, 0.18)'
  if (rank <= 40) return 'rgba(0, 212, 255, 0.08)'
  return 'rgba(255, 255, 255, 0.02)'
}

export default function NumberRankTable({ draws }) {
  const grid = useMemo(() => buildGrid(draws), [draws])
  const [sortPosition, setSortPosition] = useState(null) // null = ordina per numero

  const numbers = useMemo(() => {
    const nums = Array.from({ length: 90 }, (_, i) => i + 1)
    if (sortPosition === null) return nums
    return nums.slice().sort((a, b) => {
      const ra = grid[a][sortPosition] ?? 999
      const rb = grid[b][sortPosition] ?? 999
      return ra - rb
    })
  }, [grid, sortPosition])

  const lastDraw = draws[draws.length - 1]

  return (
    <div className="rank-table-wrap">
      <h3>🔢 Rank di tutti i 90 numeri per posizione</h3>
      <p className="rank-table-caption">
        Aggiornato all'estrazione del {lastDraw ? lastDraw[0] : '-'}. Tocca l'intestazione di una
        posizione per ordinare la tabella secondo quella colonna. Cella vuota = il numero non è
        mai stato candidato osservato in quella posizione.
      </p>
      <div className="rank-table-scroll">
        <table className="rank-table">
          <thead>
            <tr>
              <th
                className={sortPosition === null ? 'active' : ''}
                onClick={() => setSortPosition(null)}
              >
                N.
              </th>
              {POSITION_LABELS.map((label, p) => (
                <th
                  key={p}
                  className={sortPosition === p ? 'active' : ''}
                  onClick={() => setSortPosition(p)}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {numbers.map(n => (
              <tr key={n}>
                <td className="rank-table-number">{n}</td>
                {grid[n].map((rank, p) => (
                  <td key={p} style={{ background: rankColor(rank) }}>
                    {rank ?? '–'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
