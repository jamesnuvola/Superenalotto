import { useMemo } from 'react'
import { POS_COLORS } from '../utils/constants'
import { generateTopSestine } from '../engine/multigen'
import './Home.css'

export default function Home({ draws }) {
  const topSestine = useMemo(() => generateTopSestine(draws, 10), [draws])
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
            {topSestine[0].numeri.map((num, i) => (
              <div className="sestina-ball-wrap" key={i}>
                <span className="sestina-ball" style={{ background: POS_COLORS[i % 6] }}>
                  {num}
                </span>
                <span className="sestina-rank">
                  P{i + 1} · rank {topSestine[0].dettaglio[i].rank}/{topSestine[0].dettaglio[i].poolSize}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="sestina-featured-label">
          ↑ La migliore (punteggio {topSestine[0]?.punteggioTotale.toFixed(2)})
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
          {draws.slice(-10).reverse().map((draw, idx) => (
            <div key={idx} className="draw-row">
              <span className="draw-date">{draw[0]}</span>
              <span className="draw-number">#{draw[1]}</span>
              <div className="draw-numbers">
                {draw[2].map((num, i) => (
                  <span
                    key={i}
                    className="draw-num-ball"
                    style={{ background: POS_COLORS[i % 6] }}
                  >
                    {num}
                  </span>
                ))}
              </div>
              <span className="draw-jolly">🎯 {draw[3]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
