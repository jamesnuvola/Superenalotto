import { useState } from 'react'
import { COLORS } from '../utils/constants'
import './Header.css'

export default function Header({ draws, activeTab, setActiveTab }) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    // Aggiunge un parametro univoco per forzare il browser (o l'app salvata
    // in Home) a scaricare una copia fresca invece di usare la cache.
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
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button 
          className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          🔍 Ricerca
        </button>
        <button 
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📈 Statistiche
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Impostazioni
        </button>
      </nav>
    </header>
  )
}
