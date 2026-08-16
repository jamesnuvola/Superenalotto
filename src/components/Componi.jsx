import { useMemo, useState } from 'react'
import { POS_COLORS } from '../utils/constants'
import { actualRank, POSITION_LABELS } from '../engine/scoring'
import { bandaDiRank } from '../engine/dominant-band'
import Sparkline from './Sparkline'
import './Home.css'
import './sonar-ui.css'

function parseDataIT(dataStr) {
  const [g, m, a] = dataStr.split('/').map(Number)
  return { mese: m, anno: a }
}

function usciteNelMeseCorrente(draws, num) {
  const now = new Date()
  const mese = now.getMonth() + 1
  const anno = now.getFullYear()
  return draws.filter(d => {
    const { mese: m, anno: a } = parseDataIT(d[0])
    return m === mese && a === anno && d[2].includes(num)
  }).length
}

function distanzaInPosizione(draws, position, num) {
  for (let i = draws.length - 1; i >= 0; i--) {
    if (draws[i][2][position] === num) return draws.length - 1 - i
  }
  return null // mai uscito in questa posizione
}

export default function Componi({ draws }) {
  const [inputs, setInputs] = useState(['', '', '', '', '', ''])

  const numeri = inputs.map(v => parseInt(v, 10))
  const tuttiValidi = numeri.every(n => Number.isInteger(n) && n >= 1 && n <= 90)
  const duplicati = tuttiValidi && new Set(numeri).size !== 6

  // Ordiniamo crescente prima di valutarli: la posizione P1-P6 del motore
  // rispecchia l'ordine crescente con cui le estrazioni reali sono registrate.
  const numeriOrdinati = tuttiValidi && !duplicati ? [...numeri].sort((a, b) => a - b) : null

  const dettaglio = useMemo(() => {
    if (!numeriOrdinati) return null
    const attesoPerNumero = (draws.length * 6) / 90
    return numeriOrdinati.map((num, p) => {
      const { rank, poolSize } = actualRank(draws, p, num)
      const banda = bandaDiRank(rank)
      const uscite = usciteNelMeseCorrente(draws, num)
      const distanza = distanzaInPosizione(draws, p, num)
      return {
        posizione: p,
        num,
        rank,
        poolSize,
        banda,
        uscite,
        atteso: attesoPerNumero,
        sorpresa: uscite - attesoPerNumero,
        distanza
      }
    })
  }, [numeriOrdinati, draws])

  const handleChange = (i, value) => {
    const next = [...inputs]
    next[i] = value.replace(/[^0-9]/g, '')
    setInputs(next)
  }

  return (
    <div className="home">
      <section className="home-section">
        <h2>✍️ Componi la tua sestina</h2>
        <p className="home-caption">
          Inserisci 6 numeri (1-90, tutti diversi). Vengono valutati in ordine crescente — lo stesso
          ordine con cui il motore osserva le posizioni P1-P6 nelle estrazioni reali — con le stesse
          regole validate usate per generare le sestine consigliate.
        </p>

        <div className="componi-form">
          {inputs.map((v, i) => (
            <div className="componi-input-wrap" key={i}>
              <label>N. {i + 1}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={v}
                onChange={e => handleChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>

        {duplicati && <p className="componi-error">I 6 numeri devono essere tutti diversi tra loro.</p>}

        {dettaglio && (
          <>
            <p className="sestina-chart-label">
              📊 Rank per posizione (ordine crescente: {numeriOrdinati.join(', ')})
            </p>
            <Sparkline
              values={dettaglio.map(d => d.rank)}
              labels={POSITION_LABELS}
              color="#00d4ff"
              invertY={true}
              yMin={1}
            />

            <div className="sestina-display featured">
              {dettaglio.map((d, i) => (
                <div className="sestina-ball-wrap" key={i}>
                  <span className="sestina-ball" style={{ background: POS_COLORS[i % 6] }}>{d.num}</span>
                  <span className="sestina-rank">P{i + 1} · rank {d.rank}/{d.poolSize}</span>
                </div>
              ))}
            </div>

            <table className="componi-stats-table">
              <thead>
                <tr>
                  <th>Numero</th>
                  <th>Posizione</th>
                  <th>Rank</th>
                  <th>Banda</th>
                  <th>Uscite mese</th>
                  <th>Osservato − atteso</th>
                  <th>Distanza (in questa posizione)</th>
                </tr>
              </thead>
              <tbody>
                {dettaglio.map(d => (
                  <tr key={d.posizione}>
                    <td>{d.num}</td>
                    <td>P{d.posizione + 1}</td>
                    <td>{d.rank}/{d.poolSize}</td>
                    <td>{d.banda}</td>
                    <td>{d.uscite}</td>
                    <td>{d.sorpresa >= 0 ? '+' : ''}{d.sorpresa.toFixed(1)}</td>
                    <td>{d.distanza === null ? 'mai uscito qui' : `${d.distanza} estrazioni fa`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>
    </div>
  )
}
