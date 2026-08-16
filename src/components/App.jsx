import { useState, useEffect } from 'react'
import { COLORS } from '../utils/constants'
import SEED_DRAWS from '../data/draws'
import Header from './Header'
import Genera from './Genera'
import Andamento from './Andamento'
import Storico from './Storico'
import Griglia from './Griglia'
import Componi from './Componi'
import './App.css'

export default function App() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('genera')

  useEffect(() => {
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
        {activeTab === 'genera' && <Genera draws={draws} />}
        {activeTab === 'andamento' && <Andamento draws={draws} />}
        {activeTab === 'storico' && <Storico draws={draws} />}
        {activeTab === 'griglia' && <Griglia draws={draws} />}
        {activeTab === 'componi' && <Componi draws={draws} />}
      </main>

      <footer className="app-footer">
        <p>SONAR SuperEnalotto v2.0 | Dati verificati: {draws.length} estrazioni | © 2026</p>
      </footer>
    </div>
  )
}