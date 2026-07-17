import { useMemo } from 'react'
import { POS_COLORS } from '../utils/constants'
import PositionTrends from './PositionTrends'
import NumberRankTable from './NumberRankTable'
import './Dashboard.css' // riusa stats-grid, stat-card, two-column, number-list, ecc.

export default function Statistics({ draws }) {
  const stats = useMemo(() => {
    if (draws.length === 0) return null

    const frequencyMap = {}
    draws.forEach(draw => {
      const [, , numbers] = draw
      numbers.forEach(num => {
        frequencyMap[num] = (frequencyMap[num] || 0) + 1
      })
    })

    const topNumbers = Object.entries(frequencyMap).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const bottomNumbers = Object.entries(frequencyMap).sort((a, b) => a[1] - b[1]).slice(0, 10)

    return {
      topNumbers,
      bottomNumbers,
      totalDraws: draws.length,
      uniqueNumbers: Object.keys(frequencyMap).length
    }
  }, [draws])

  if (!stats) {
    return <div className="dashboard">Nessun dato disponibile</div>
  }

  return (
    <div className="dashboard">
      <PositionTrends draws={draws} />
      <NumberRankTable draws={draws} />

      <section className="dashboard-section">
        <h2>📊 Panoramica Generale</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">📁</span>
            <span className="stat-label">Estrazioni Totali</span>
            <span className="stat-number">{stats.totalDraws}</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🎯</span>
            <span className="stat-label">Numeri Unici</span>
            <span className="stat-number">{stats.uniqueNumbers}</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">📈</span>
            <span className="stat-label">Copertura</span>
            <span className="stat-number">{Math.round((stats.uniqueNumbers / 90) * 100)}%</span>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⚡</span>
            <span className="stat-label">Media per Numero</span>
            <span className="stat-number">{(stats.totalDraws * 6 / stats.uniqueNumbers).toFixed(1)}</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section">
        <div className="two-column">
          <div className="column">
            <h3>🔥 Top 10 Numeri più Frequenti</h3>
            <div className="number-list">
              {stats.topNumbers.map(([num, count], idx) => (
                <div key={num} className="number-item">
                  <div className="rank-badge">{idx + 1}</div>
                  <div className="number-info">
                    <span className="number-value">{num}</span>
                    <span className="number-label">Frequenza: {count}</span>
                  </div>
                  <div className="number-bar">
                    <div
                      className="number-bar-fill"
                      style={{
                        width: `${(count / stats.topNumbers[0][1]) * 100}%`,
                        background: POS_COLORS[idx % 6]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="column">
            <h3>❄️ Top 10 Numeri meno Frequenti</h3>
            <div className="number-list">
              {stats.bottomNumbers.map(([num, count], idx) => (
                <div key={num} className="number-item">
                  <div className="rank-badge" style={{ background: '#4488ff' }}>{idx + 1}</div>
                  <div className="number-info">
                    <span className="number-value">{num}</span>
                    <span className="number-label">Frequenza: {count}</span>
                  </div>
                  <div className="number-bar">
                    <div
                      className="number-bar-fill"
                      style={{
                        width: `${(count / stats.topNumbers[0][1]) * 100}%`,
                        background: '#4488ff'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
