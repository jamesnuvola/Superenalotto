import { useState, useEffect } from 'react'
import { v, FONT, MONO } from '../utils/constants'
import SEED_DRAWS from '../data/draws'
import Genera from './Genera'
import Andamento from './Andamento'
import Storico from './Storico'
import Griglia from './Griglia'
import Componi from './Componi'

const TABS = [
  { id: 'genera', label: 'Genera' },
  { id: 'andamento', label: 'Andamento' },
  { id: 'storico', label: 'Storico' },
  { id: 'griglia', label: 'Griglia' },
  { id: 'componi', label: 'Componi' }
]

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: v.bg, color: v.muted, fontFamily: FONT, fontSize: 18 }}>
        Caricamento SONAR...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: v.bg, color: v.text, fontFamily: FONT, width: '100%' }}>
      <header style={{ borderBottom: `1px solid ${v.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
            <span style={{ fontFamily: MONO, color: v.accent, fontSize: 20, letterSpacing: 1 }}>SONAR</span>
            <span style={{ color: v.muted, fontSize: 13 }}>SuperEnalotto — Laboratorio</span>
          </div>
          <nav style={{ display: 'flex', gap: 0, width: '100%', justifyContent: 'space-between' }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  background: activeTab === t.id ? v.card : 'transparent',
                  color: activeTab === t.id ? v.accent : v.muted,
                  border: 'none',
                  borderBottom: activeTab === t.id ? `2px solid ${v.accent}` : '2px solid transparent',
                  padding: '9px 3px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontWeight: activeTab === t.id ? 700 : 400,
                  letterSpacing: -0.2,
                  flex: '0 1 auto',
                  minWidth: 0,
                  whiteSpace: 'nowrap'
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ padding: 16, maxWidth: 900, margin: '0 auto' }}>
        {activeTab === 'genera' && <Genera draws={draws} />}
        {activeTab === 'andamento' && <Andamento draws={draws} />}
        {activeTab === 'storico' && <Storico draws={draws} />}
        {activeTab === 'griglia' && <Griglia draws={draws} />}
        {activeTab === 'componi' && <Componi draws={draws} />}
      </main>

      <footer style={{ textAlign: 'center', color: v.dim, fontSize: 11, padding: '20px 0', fontFamily: MONO }}>
        {draws.length} estrazioni · SONAR v2 · © 2026
      </footer>
    </div>
  )
}
