import { useState } from 'react'
import { COLORS } from '../utils/constants'
import './Header.css'

export default function Header({ draws, activeTab, setActiveTab }) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    window.location.href = window.location.pathname + '?_=' + Date.now()
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>🎯 SONAR SuperEnalotto</h1>
          <p className="subtitle">Analizzatore Professionale Estrazioni</p>
        </div>
        <div className="header-actions">
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-label">Estrazioni</span>
              <span className="stat-value">{draws.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Intervallo</span>
              <span className="stat-value">2009-2026</span>
            </div>
          </div>
          <button
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Ricarica i dati più recenti"
          >
            🔄
          </button>
        </div>
      </div>
      
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'genera' ? 'active' : ''}`}
          onClick={() => setActiveTab('genera')}
        >
          🎲 Genera
        </button>
        <button
          className={`tab-btn ${activeTab === 'andamento' ? 'active' : ''}`}
          onClick={() => setActiveTab('andamento')}
        >
          📈 Andamento
        </button>
        <button
          className={`tab-btn ${activeTab === 'storico' ? 'active' : ''}`}
          onClick={() => setActiveTab('storico')}
        >
          📅 Storico
        </button>
        <button
          className={`tab-btn ${activeTab === 'griglia' ? 'active' : ''}`}
          onClick={() => setActiveTab('griglia')}
        >
          🔢 Griglia
        </button>
        <button
          className={`tab-btn ${activeTab === 'componi' ? 'active' : ''}`}
          onClick={() => setActiveTab('componi')}
        >
          ✍️ Componi
        </button>
      </nav>
    </header>
  )
}