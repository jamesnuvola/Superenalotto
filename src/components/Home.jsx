import { useMemo } from 'react'
import { POS_COLORS } from '../utils/constants'
import { generateTopSestine, HISTORICAL_AVG_RANK, RANK_BANDS_BY_POSITION } from '../engine/multigen'
import { actualRank } from '../engine/scoring'
import './Home.css'

const RECENT_LOOKBACK = 10

// Calcola, per le ultime N estrazioni reali, il rank di ciascun numero per
// posizione (usando SOLO le estrazioni precedenti, walk-forward) e il rank
// medio della sestina — stessa metrica usata per le sestine proposte, cosi'
// si possono confrontare direttamente.
function computeRecentWithRank(draws) {
  const n = draws.length
  const startIdx = Math.max(1, n - RECENT_LOOKBACK)
  const results = []
  for (let t = n - 1; t >= startIdx; t--) {
    const history = draws.slice(0, t)
    const ranks = draws[t][2].map((num, p) => actualRank(history, p, num).rank)
    const rankMedio = ranks.reduce((s, r) => s + r, 0) / ranks.length
    results.push({ draw: draws[t], ranks, rankMedio })
  }
  return results
}

export default function Home({ draws }) {
  const topSestine = useMemo(() => generateTopSestine(draws, 10), [draws])
  const recentWithRank = useMemo(() => computeRecentWithRank(draws), [draws])
  const lastDraw = draws[draws.length - 1]

  return (
    <div className="home">
      <section className="home-section">
        <h2>🎲 Sestine Consigliate</h2>
        <p className="home-caption">
          Generate dal motore statistico SONAR (regole validate su {draws.length} estrazioni reali),
          escludendo qualunque combinazione già uscita — intera o per 5 numeri su 6.
          Sono ordinate per <strong>punteggio totale</strong>: la somma di quanto ciascuno dei 6 numeri
          è "atteso" nella propria posizione secondo le regole validate (più alto il punteggio di un
          numero, più le regole lo indicano come probabile in quella posizione in questo momento).
          È un gioco statistico, non una previsione: nessun sistema può garantire un'estrazione.
        </p>

        {topSestine.length > 0 && (
          <div className="sestina-display featured">
            {topSestine[0].numeri.map((num, i) => {
              const d = topSestine[0].dettaglio[i]
              const band = RANK_BANDS_BY_POSITION[i]
              const qualifier = d.rank <= band.p25
                ? `meglio del solito (fascia tipica: ${band.p25}-${band.p75})`
                : d.rank <= band.p75
                  ? `nella norma (fascia tipica: ${band.p25}-${band.p75})`
                  : `sotto la media tipica (${band.p25}-${band.p75})`
              return (
                <div className="sestina-ball-wrap" key={i}>
                  <span className="sestina-ball" style={{ background: POS_COLORS[i % 6] }}>
                    {num}
                  </span>
                  <span className="sestina-rank">P{i + 1} · rank {d.rank}/{d.poolSize}</span>
                  <span className="sestina-qualifier">{qualifier}</span>
                </div>
              )
            })}
          </div>
        )}
        <p className="sestina-featured-label">
          ↑ La migliore (punteggio {topSestine[0]?.punteggioTotale.toFixed(2)})
        </p>

        <p className="honesty-note">
          ℹ️ Rank medio di questa proposta: <strong>{topSestine[0]?.rankMedio.toFixed(2)}</strong>.
          Le sestine mostrate sono filtrate per restare dentro la fascia di rank medio
          realmente osservata nelle 2.874 estrazioni reali (tra {HISTORICAL_AVG_RANK.p10} e{' '}
          {HISTORICAL_AVG_RANK.p90}) — scartiamo automaticamente i profili troppo ottimistici,
          mai verificatisi in passato. Restano comunque tra i più favorevoli statisticamente
          possibili: è un gioco statistico, non una previsione.
        </p>

        <div className="sestine-list">
          {topSestine.slice(1).map((s, i) => (
            <div className="sestina-row" key={i}>
              <span className="sestina-row-rank">#{i + 2}</span>
              <div className="sestina-row-balls">
                {s.numeri.map((num, j) => (
                  <span key={j} className="sestina-mini-ball" style={{ background: POS_COLORS[j % 6] }}>
                    {num}
                  </span>
                ))}
              </div>
              <span className="sestina-row-score">{s.punteggioTotale.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section">
        <h2>📌 In breve</h2>
        <div className="indicators-row">
          <div className="indicator-card">
            <span className="indicator-label">Estrazioni analizzate</span>
            <span className="indicator-value">{draws.length}</span>
          </div>
          <div className="indicator-card">
            <span className="indicator-label">Ultima estrazione</span>
            <span className="indicator-value">{lastDraw ? lastDraw[0] : '-'}</span>
          </div>
          <div className="indicator-card">
            <span className="indicator-label">Concorso</span>
            <span className="indicator-value">#{lastDraw ? lastDraw[1] : '-'}</span>
          </div>
        </div>
      </section>

      <section className="home-section">
        <h3>📅 Ultime Estrazioni</h3>
        <div className="draws-table">
          {recentWithRank.map((item, idx) => (
            <div key={idx} className="draw-row">
              <span className="draw-date">{item.draw[0]}</span>
              <span className="draw-number">#{item.draw[1]}</span>
              <div className="draw-numbers">
                {item.draw[2].map((num, i) => (
                  <div key={i} className="draw-num-wrap">
                    <span
                      className="draw-num-ball"
                      style={{ background: POS_COLORS[i % 6] }}
                    >
                      {num}
                    </span>
                    <span className="draw-num-rank">#{item.ranks[i]}</span>
                  </div>
                ))}
              </div>
              <span className="draw-jolly">🎯 {item.draw[3]}</span>
              <span className="draw-rank-medio">rank medio {item.rankMedio.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
