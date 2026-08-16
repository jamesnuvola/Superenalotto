import { useMemo } from 'react'
import { POS_COLORS, utils } from '../utils/constants'
import NumberRankTable from './NumberRankTable'
import './Dashboard.css'

function parseDataIT(dataStr) {
  const [g, m, a] = dataStr.split('/').map(Number)
  return { giorno: g, mese: m, anno: a }
}

function frequenzaNelPeriodo(draws, filtro) {
  const freq = {}
  for (const draw of draws) {
    const { mese, anno } = parseDataIT(draw[0])
    if (!filtro(mese, anno)) continue
    for (const num of draw[2]) freq[num] = (freq[num] || 0) + 1
  }
  return freq
}

export default function Griglia({ draws }) {
  const stats = useMemo(() => {
    if (draws.length === 0) return null
    const now = new Date()
    const meseCorrente = now.getMonth() + 1
    const annoCorrente = now.getFullYear()

    const freqTotale = {}
    draws.forEach(draw => draw[2].forEach(num => { freqTotale[num] = (freqTotale[num] || 0) + 1 }))

    const freqMese = frequenzaNelPeriodo(draws, (m, a) => m === meseCorrente && a === annoCorrente)
    const freqAnno = frequenzaNelPeriodo(draws, (m, a) => a === annoCorrente)

    const attesoPerNumero = (draws.length * 6) / 90
    const numeriUnici = Object.keys(freqTotale).length

    return {
      topNumbers: utils.getTopNumbers(draws, 10),
      bottomNumbers: utils.getBottomNumbers(draws, 10),
      freqMese,
      freqAnno,
      attesoPerNumero,
      numeriUnici,
      totalDraws: draws.length,
      meseCorrente,
      annoCorrente
    }
  }, [draws])

  if (!stats) return <div className="dashboard">Nessun dato disponibile</div>

  const usciteMese = Object.entries(stats.freqMese).sort((a, b) => b[1] - a[1])
  const usciteAnno = Object.entries(stats.freqAnno).sort((a, b) => b[1] - a[1])

  return (
    <div className="dashboard">
      <section className="dashboard-section">
        <h2>📊 Panoramica</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📁</span>
            <span className="stat-label">Estrazioni Totali</span>
            <span className="stat-number">{stats.totalDraws}</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <span className="stat-label">Numeri Usciti Almeno Una Volta</span>
            <span className="stat-number">{stats.numeriUnici}</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📈</span>
            <span className="stat-label">Frequenza Attesa per Numero</span>
            <span className="stat-number">{stats.attesoPerNumero.toFixed(1)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🗓️</span>
            <span className="stat-label">Usciti Questo Mese</span>
            <span className="stat-number">{Object.keys(stats.freqMese).length}</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="two-column">
          <div className="column">
            <h3>🗓️ Usciti nel mese corrente ({stats.meseCorrente}/{stats.annoCorrente})</h3>
            <div className="number-list">
              {usciteMese.length === 0 && <p className="rank-table-caption">Nessuna estrazione questo mese.</p>}
              {usciteMese.slice(0, 15).map(([num, count], idx) => (
                <div key={num} className="number-item">
                  <div className="rank-badge">{idx + 1}</div>
                  <div className="number-info">
                    <span className="number-value">{num}</span>
                    <span className="number-label">Uscite: {count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="column">
            <h3>📆 Totale anno {stats.annoCorrente}</h3>
            <div className="number-list">
              {usciteAnno.slice(0, 15).map(([num, count], idx) => (
                <div key={num} className="number-item">
                  <div className="rank-badge">{idx + 1}</div>
                  <div className="number-info">
                    <span className="number-value">{num}</span>
                    <span className="number-label">
                      Uscite: {count} · atteso {stats.attesoPerNumero > 0 ? ((count - stats.attesoPerNumero * (usciteAnno.length ? 1 : 0)).toFixed(1)) : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="two-column">
          <div className="column">
            <h3>🔥 Top 10 più frequenti (storico completo)</h3>
            <div className="number-list">
              {stats.topNumbers.map((item, idx) => (
                <div key={item.num} className="number-item">
                  <div className="rank-badge">{idx + 1}</div>
                  <div className="number-info">
                    <span className="number-value">{item.num}</span>
                    <span className="number-label">Frequenza: {item.count} (atteso {stats.attesoPerNumero.toFixed(1)})</span>
                  </div>
                  <div className="number-bar">
                    <div
                      className="number-bar-fill"
                      style={{ width: `${(item.count / stats.topNumbers[0].count) * 100}%`, background: POS_COLORS[idx % 6] }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="column">
            <h3>❄️ Top 10 meno frequenti (storico completo)</h3>
            <div className="number-list">
              {stats.bottomNumbers.map((item, idx) => (
                <div key={item.num} className="number-item">
                  <div className="rank-badge" style={{ background: '#4488ff' }}>{idx + 1}</div>
                  <div className="number-info">
                    <span className="number-value">{item.num}</span>
                    <span className="number-label">Frequenza: {item.count} (atteso {stats.attesoPerNumero.toFixed(1)})</span>
                  </div>
                  <div className="number-bar">
                    <div
                      className="number-bar-fill"
                      style={{ width: `${(item.count / stats.topNumbers[0].count) * 100}%`, background: '#4488ff' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <NumberRankTable draws={draws} />
    </div>
  )
}
