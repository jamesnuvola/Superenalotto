import { useState, useEffect } from 'react'
import { COLORS, storage } from '../utils/constants'
import SEED_DRAWS from '../data/draws'
import Header from './Header'
import Home from './Home'
import Statistics from './Statistics'
import './App.css'

export default function App() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    // Carica i dati
    setDraws(SEED_DRAWS)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: COLORS.bg }}>
        <div style={{ color: COLORS.muted, fontSize: '18px' }}>Caricamento SONAR...</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Header draws={draws} activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="app-main">
        {activeTab === 'dashboard' && <Home draws={draws} />}
        {activeTab === 'search' && <div style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>🔍 Ricerca - Coming Soon</div>}
        {activeTab === 'stats' && <Statistics draws={draws} />}
        {activeTab === 'settings' && <div style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>⚙️ Impostazioni - Coming Soon</div>}
      </main>

      <footer className="app-footer">
        <p>SONAR SuperEnalotto v2.0 | Dati verificati: {draws.length} estrazioni | © 2026</p>
      </footer>
    </div>
  )
}
