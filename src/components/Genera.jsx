import { useMemo, useState } from 'react'
import { POS_COLORS } from '../utils/constants'
import { generateTopSestine, HISTORICAL_AVG_RANK, RANK_BANDS_BY_POSITION } from '../engine/multigen'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import { statoRegolaPerPosizione } from '../engine/dominant-band'
import Sparkline from './Sparkline'
import './Home.css'
import './sonar-ui.css'

const RECENT_LOOKBACK = 10
const STATI_FORZABILI = ['AUTO', 'INCLUDI', 'ESCLUDI', 'SPENTA']

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

export default function Genera({ draws }) {
  const statiAuto = useMemo(() => statoRegolaPerPosizione(draws), [draws])
  const [override, setOverride] = useState({}) // { posizione: 'AUTO'|'INCLUDI'|'ESCLUDI'|'SPENTA' }
  const [selectedIdx, setSelectedIdx] = useState(0)

  const statiEffettivi = useMemo(
    () => statiAuto.map((s, p) => (override[p] && override[p] !== 'AUTO' ? { ...s, stato: override[p] } : s)),
    [statiAuto, override]
  )

  const topSestine = useMemo(
    () => generateTopSestine(draws, 10, { statiBandaDominante: statiEffettivi }),
    [draws, statiEffettivi]
  )
  const recentWithRank = useMemo(() => computeRecentWithRank(draws), [draws])
  const lastDraw = draws[draws.length - 1]

  const selezionata = topSestine[Math.min(selectedIdx, topSestine.length - 1)]

  return (
    <div className="home">
      <section className="home-section">
        <h2>🎛️ Regola banda dominante</h2>
        <p className="home-caption">
          Per ogni posizione, la fascia di rank che negli ultimi 6 mesi (e nell'ultima settimana, con lo
          stesso segno) ha prodotto più numeri del previsto. "Auto" usa il segno rilevato ora; puoi forzare
          una posizione a favorire, evitare o disattivare la regola. Vantaggio piccolo (2-3 punti %),
          da trattare come indicatore.
        </p>
        <div className="banda-panel">
          {POSITION_LABELS.map((label, p) => {
            const s = statiEffettivi[p]
            const cur = override[p] || 'AUTO'
            return (
              <div className="banda-card" key={label}>
                <div className="banda-card-header">
                  <strong>{label}</strong>
                  <span className={`banda-stato ${s.stato.toLowerCase()}`}>{s.stato}</span>
                </div>
                <div className="banda-detail">
                  banda {s.banda} · 6m {s.v6 > 0 ? '+' : ''}{s.v6}% · sett {s.vSettPrec > 0 ? '+' : ''}{s.vSettPrec}%
                </div>
                <div className="banda-toggle">
                  {STATI_FORZABILI.map(st => (
                    <button
                      key={st}
                      className={cur === st ? 'active' : ''}
                      onClick={() => setOverride(o => ({ ...o, [p]: st }))}
                    >
                      {st === 'AUTO' ? 'Auto' : st === 'INCLUDI' ? 'Favorisci' : st === 'ESCLUDI' ? 'Evita' : 'Off'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

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
          <div
            className="sestina-display featured"
            onClick={() => setSelectedIdx(0)}
            style={{ cursor: 'pointer' }}
          >
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
            <div
              className={`sestina-row ${selectedIdx === i + 1 ? 'selected' : ''}`}
              key={i}
              onClick={() => setSelectedIdx(i + 1)}
              style={{ cursor: 'pointer' }}
            >
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

        {selezionata && (
          <>
            <p className="sestina-chart-label">
              📊 Rank per posizione della sestina selezionata (#{selectedIdx + 1}) — più in alto, più il
              numero è "atteso" in quella posizione
            </p>
            <Sparkline
              values={selezionata.dettaglio.map(d => d.rank)}
              labels={POSITION_LABELS}
              color="#00d4ff"
              invertY={true}
              yMin={1}
            />
          </>
        )}
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
                    <span className="draw-num-ball" style={{ background: POS_COLORS[i % 6] }}>
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
