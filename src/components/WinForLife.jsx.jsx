import { useState, useEffect, useCallback } from 'react'
import { COLORS } from '../utils/constants'

const DATA_URL = 'https://jamesnuvola.github.io/Superenalotto/winforlife/winforlife_draws.json'

// Dati di fallback (primi concorsi del 2026) – presi dal tuo CSV
const FALLBACK_DRAWS = [
  { "datetime": "2026-01-01T07:00", "numbers": [3,5,8,9,10,11,12,13,16,19], "numerone": 14, "numero": 1 },
  { "datetime": "2026-01-01T08:00", "numbers": [1,3,4,5,8,9,10,11,15,17], "numerone": 12, "numero": 2 },
  { "datetime": "2026-01-01T09:00", "numbers": [2,3,5,9,11,12,15,17,18,20], "numerone": 11, "numero": 3 },
  { "datetime": "2026-01-01T10:00", "numbers": [1,2,6,7,8,9,10,13,14,17], "numerone": 14, "numero": 4 },
  { "datetime": "2026-01-01T11:00", "numbers": [1,2,5,8,10,11,13,14,16,17], "numerone": 2, "numero": 5 },
  { "datetime": "2026-01-01T12:00", "numbers": [1,2,3,7,8,13,15,16,18,19], "numerone": 17, "numero": 6 },
  { "datetime": "2026-01-01T13:00", "numbers": [3,7,8,11,13,16,17,18,19,20], "numerone": 2, "numero": 7 },
  { "datetime": "2026-01-01T14:00", "numbers": [1,3,5,6,9,11,12,14,17,19], "numerone": 19, "numero": 8 },
  { "datetime": "2026-01-01T15:00", "numbers": [2,3,5,8,10,14,15,17,18,20], "numerone": 18, "numero": 9 },
  { "datetime": "2026-01-01T16:00", "numbers": [2,3,4,8,9,10,11,16,18,19], "numerone": 9, "numero": 10 }
]

export default function WinForLife() {
  const [draws, setDraws] = useState(FALLBACK_DRAWS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [combination, setCombination] = useState(null)
  const [numerone, setNumerone] = useState(null)
  const [backtestResult, setBacktestResult] = useState('')
  const [usingFallback, setUsingFallback] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(DATA_URL)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (Array.isArray(data) && data.length >= 10) {
          setDraws(data)
          setUsingFallback(false)
        } else {
          throw new Error('Dati insufficienti')
        }
      } catch (err) {
        console.warn('Fetch fallito, uso dati statici:', err.message)
        setDraws(FALLBACK_DRAWS)
        setUsingFallback(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const generate = useCallback(() => {
    if (draws.length < 10) return alert('Carica almeno 10 estrazioni.')
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

  const last = draws[draws.length - 1]

  return (
    <div className="wl-container" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: COLORS.text }}>🍀 Win for Life</h2>
      {usingFallback && (
        <p style={{ color: 'orange', fontSize: '0.9rem' }}>
          ⚠️ Dati statici di esempio – il file aggiornato non è ancora disponibile su GitHub Pages. Il workflow di aggiornamento orario creerà presto il file JSON; appena sarà online, l'app caricherà automaticamente lo storico completo.
        </p>
      )}
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