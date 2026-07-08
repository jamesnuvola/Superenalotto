import { COLORS } from '../utils/constants'
import './Header.css'

export default function Header({ draws, activeTab, setActiveTab }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-title">
          <h1>🎯 SONAR SuperEnalotto</h1>
          <p className="subtitle">Analizzatore Professionale Estrazioni</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">Estrazioni</span>
            <span className="stat-value">{draws.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Intervallo</span>
            <span className="stat-value">2021-2026</span>
          </div>
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
