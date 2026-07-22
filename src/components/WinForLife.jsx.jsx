import { useState, useEffect, useCallback } from 'react'
import { COLORS } from '../utils/constants'

const DATA_URL = 'https://jamesnuvola.github.io/Superenalotto/winforlife/winforlife_draws.json'

export default function WinForLife() {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [combination, setCombination] = useState(null)
  const [numerone, setNumerone] = useState(null)
  const [backtestResult, setBacktestResult] = useState('')

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(DATA_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!Array.isArray(data) || data.length < 10) throw new Error('Dati insufficienti')
        setDraws(data)
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const generate = useCallback(() => {
    if (draws.length < 10) return alert('Carica almeno 10 estrazioni.')
    // Placeholder: qui integrerai la logica di multigen.wlf.js
    const nums = Array.from({ length: 10 }, (_, i) => i + 1)
    setCombination(nums)
    setNumerone(5)
  }, [draws])

  const runBacktest = useCallback(() => {
    setBacktestResult('Backtest non ancora implementato nella UI React.')
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: COLORS.muted }}>
        Caricamento dati Win for Life...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: COLORS.danger || 'red' }}>
        Errore nel caricamento dati: {error}
        <br />
        <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Riprova
        </button>
      </div>
    )
  }

  const last = draws[draws.length - 1]

  return (
    <div className="wl-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: COLORS.text }}>🍀 Win for Life</h2>
      <p style={{ color: COLORS.muted }}>
        Ultima estrazione: {last?.datetime} — {last?.numbers?.join(' ')} | Numerone: {last?.numerone}
      </p>
      <p style={{ color: COLORS.muted }}>Totale estrazioni caricate: {draws.length}</p>

      <div style={{ marginTop: '20px' }}>
        <button onClick={generate} style={{ padding: '0.5rem 1rem', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '6px', marginRight: '1rem', cursor: 'pointer' }}>
          🎲 Genera combinazione
        </button>
        <button onClick={runBacktest} style={{ padding: '0.5rem 1rem', background: COLORS.accent, color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          📊 Backtest
        </button>
      </div>

      {combination && (
        <div style={{ marginTop: '20px', background: COLORS.bgLight || '#f0f0f0', padding: '15px', borderRadius: '8px' }}>
          <p>Combinazione generata: <strong>{combination.join(' – ')}</strong></p>
          <p>Numerone: <strong>{numerone}</strong></p>
        </div>
      )}

      {backtestResult && (
        <div style={{ marginTop: '20px', background: COLORS.bgLight || '#f0f0f0', padding: '15px', borderRadius: '8px' }}>
          <p>{backtestResult}</p>
        </div>
      )}

      <div style={{ marginTop: '30px', color: COLORS.muted, fontSize: '0.9rem' }}>
        <p>I dati vengono aggiornati automaticamente ogni ora tramite GitHub Actions.</p>
      </div>
    </div>
  )
}