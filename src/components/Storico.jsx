import { useMemo, useState } from 'react'
import { POS_COLORS, CONFIG } from '../utils/constants'
import rankHistory from '../data/rank-history.json'
import './Home.css'
import './sonar-ui.css'

// L'archivio dei rank (src/data/rank-history.json) viene popolato in modo
// incrementale da scripts/update-draws.mjs ad ogni nuova estrazione reale
// (fino a un massimo di 500 voci più recenti) — le estrazioni più vecchie di
// quella finestra non hanno un rank calcolato e vengono mostrate senza.
function buildRankIndex() {
  const idx = new Map()
  for (const entry of rankHistory) {
    idx.set(`${entry.data}_${entry.concorso}`, entry)
  }
  return idx
}

export default function Storico({ draws }) {
  const rankIndex = useMemo(buildRankIndex, [])
  const perPage = CONFIG.DRAWS_PER_PAGE || 20
  const [page, setPage] = useState(0)

  // Più recenti prima
  const ordered = useMemo(() => [...draws].reverse(), [draws])
  const totalPages = Math.max(1, Math.ceil(ordered.length / perPage))
  const start = page * perPage
  const pageItems = ordered.slice(start, start + perPage)

  return (
    <div className="home">
      <section className="home-section">
        <h2>📅 Storico completo ({draws.length} estrazioni)</h2>
        <p className="home-caption">
          Tutte le estrazioni reali, dalla più recente. Il rank (posizione nella classifica dei
          candidati del motore, calcolato walk-forward) è disponibile per le estrazioni più recenti,
          quelle già registrate in rank-history.json; per lo storico più lontano nel tempo viene
          mostrato solo il numero uscito.
        </p>

        <div className="storico-pagination">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
            ← Più recenti
          </button>
          <span className="storico-pagination-label">
            pagina {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            Meno recenti →
          </button>
        </div>

        <div className="draws-table">
          {pageItems.map((draw, idx) => {
            const entry = rankIndex.get(`${draw[0]}_${draw[1]}`)
            return (
              <div key={start + idx} className="draw-row">
                <span className="draw-date">{draw[0]}</span>
                <span className="draw-number">#{draw[1]}</span>
                <div className="draw-numbers">
                  {draw[2].map((num, i) => (
                    <div key={i} className="draw-num-wrap">
                      <span className="draw-num-ball" style={{ background: POS_COLORS[i % 6] }}>
                        {num}
                      </span>
                      {entry && <span className="draw-num-rank">#{entry.ranks[i]}</span>}
                    </div>
                  ))}
                </div>
                <span className="draw-jolly">🎯 {draw[3]}</span>
                {entry
                  ? <span className="draw-rank-medio">rank medio {entry.rankMedio.toFixed(1)}</span>
                  : <span className="draw-rank-unavailable">rank non disponibile</span>}
              </div>
            )
          })}
        </div>

        <div className="storico-pagination">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
            ← Più recenti
          </button>
          <span className="storico-pagination-label">
            pagina {page + 1} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
            Meno recenti →
          </button>
        </div>
      </section>
    </div>
  )
}
