import { useMemo, useState } from 'react'
import { P, styles } from '../utils/constants'
import PosizioniChart, { historicalSeries } from './PosizioniChart'
import {
  hotScores,
  delayScores,
  decadeScores,
  clusterScores,
  volatilityScores,
  coldHScores,
  POSITION_LABELS
} from '../engine/scoring'

const RULES = [
  { key: 'DECADE', label: 'DECADE', fn: decadeScores },
  { key: 'HOT_V', label: 'HOT_V', fn: hotScores },
  { key: 'CLUSTER_V', label: 'CLUSTER_V', fn: clusterScores },
  { key: 'DELAY_V', label: 'DELAY_V', fn: delayScores },
  { key: 'VERTVOL', label: 'VERTVOL', fn: volatilityScores },
  { key: 'COLD_H', label: 'COLD_H', fn: coldHScores }
]

const WEIGHTS = [0, 0.5, 1, 1.5, 2, 3]
const MAX_ANALYSIS = 240

function normalizeMap(map) {
  const values = [...map.values()]
  const max = Math.max(...values, 1e-9)
  const out = new Map()
  for (const [k, v] of map.entries()) out.set(k, v / max)
  return out
}

function buildFeatures(history) {
  return POSITION_LABELS.map((_, p) => RULES.map(rule => normalizeMap(rule.fn(history, p))))
}

function rankWithWeights(features, position, number, weights) {
  const candidates = new Set()
  for (let r = 0; r < RULES.length; r++) {
    for (const n of features[position][r].keys()) candidates.add(n)
  }

  const scored = []
  for (const n of candidates) {
    let score = 0
    for (let r = 0; r < RULES.length; r++) score += (features[position][r].get(n) || 0) * weights[r]
    scored.push([n, score])
  }
  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0])
  const idx = scored.findIndex(([n]) => n === number)
  return idx >= 0 ? idx + 1 : scored.length + 1
}

function rankDistribution(ranks) {
  const counts = { r1: 0, r2_3: 0, r4_5: 0, r6_10: 0, r11_20: 0, r21p: 0 }
  for (const rank of ranks) {
    if (rank === 1) counts.r1++
    else if (rank <= 3) counts.r2_3++
    else if (rank <= 5) counts.r4_5++
    else if (rank <= 10) counts.r6_10++
    else if (rank <= 20) counts.r11_20++
    else counts.r21p++
  }
  return counts
}

function topCoverage(ranks, maxRank) {
  return ranks.filter(r => r <= maxRank).length
}

function objective(features, target, weights) {
  const ranks = []
  let exact = 0
  let reciprocal = 0
  for (let p = 0; p < 6; p++) {
    const rank = rankWithWeights(features, p, target[p], weights)
    ranks.push(rank)
    if (rank === 1) exact++
    reciprocal += 1 / rank
  }
  // Priorità assoluta alla sestina completa, poi al numero di posizioni in top-1,
  // poi al rank medio. In questo modo il motore cerca davvero una spiegazione 6/6.
  const score = exact * 100000 + reciprocal * 1000 - ranks.reduce((a, b) => a + b, 0)
  return { score, exact, ranks, reciprocal }
}

function optimizeWeights(features, target) {
  let weights = [1, 1, 1, 1, 1, 1]
  let best = objective(features, target, weights)

  // Coordinate descent: per ogni regola proviamo una piccola griglia di pesi.
  // Ripetiamo due passaggi per permettere alle variabili di interagire.
  for (let pass = 0; pass < 2; pass++) {
    let changed = false
    for (let r = 0; r < RULES.length; r++) {
      let localBest = best
      let localWeight = weights[r]
      for (const w of WEIGHTS) {
        const candidate = [...weights]
        candidate[r] = w
        const result = objective(features, target, candidate)
        if (result.score > localBest.score) {
          localBest = result
          localWeight = w
        }
      }
      if (localWeight !== weights[r]) {
        weights[r] = localWeight
        best = localBest
        changed = true
      }
    }
    if (!changed) break
  }

  return { weights, ...objective(features, target, weights) }
}

function fingerprint(weights) {
  return weights.map(w => w.toString()).join('|')
}

function pct(n, d) {
  return d ? `${((n / d) * 100).toFixed(1)}%` : '—'
}

function fmtDate(date) {
  return date || '—'
}

function inverseAnalysis(draws, limit) {
  const start = Math.max(1, draws.length - limit)
  const rows = []

  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    const target = draws[t][2]
    const features = buildFeatures(history)
    const result = optimizeWeights(features, target)
    const currentRanks = objective(features, target, [1, 1, 1, 1, 1, 1]).ranks
    const optimizedRanks = result.ranks
    const distribution = rankDistribution(optimizedRanks)
    const targetDetails = target.map((number, p) => ({
      position: p, number, rank: optimizedRanks[p], baseRank: currentRanks[p],
      score: RULES.reduce((sum, rule, r) => sum + (features[p][r].get(number) || 0) * result.weights[r], 0),
      values: RULES.map((rule, r) => features[p][r].get(number) || 0)
    }))
    rows.push({
      index: t,
      date: draws[t][0],
      target,
      weights: result.weights,
      exact: result.exact,
      ranks: optimizedRanks,
      baseRanks: currentRanks,
      top3: topCoverage(optimizedRanks, 3),
      top5: topCoverage(optimizedRanks, 5),
      top10: topCoverage(optimizedRanks, 10),
      avgRank: optimizedRanks.reduce((a, b) => a + b, 0) / optimizedRanks.length,
      rankSum: optimizedRanks.reduce((a, b) => a + b, 0),
      distribution,
      targetDetails,
      fingerprint: fingerprint(result.weights)
    })
  }

  const exactRows = rows.filter(r => r.exact === 6)
  const fingerprints = new Map()
  for (const row of exactRows) {
    if (!fingerprints.has(row.fingerprint)) fingerprints.set(row.fingerprint, [])
    fingerprints.get(row.fingerprint).push(row)
  }

  const recurring = [...fingerprints.entries()]
    .map(([fp, occurrences]) => ({ fp, occurrences, weights: occurrences[0].weights }))
    .sort((a, b) => b.occurrences.length - a.occurrences.length)

  const ruleStats = RULES.map((rule, r) => {
    const active = rows.filter(x => x.weights[r] > 0).length
    const activeExact = exactRows.filter(x => x.weights[r] > 0).length
    const weightSum = rows.reduce((s, x) => s + x.weights[r], 0)
    return {
      ...rule,
      active,
      activeExact,
      activePct: pct(active, rows.length),
      exactPct: pct(activeExact, exactRows.length),
      avgWeight: rows.length ? weightSum / rows.length : 0
    }
  })

  // Cerca anche gli "quasi perfetti": sono utili per capire quali variabili
  // avvicinano maggiormente la vincente quando il 6/6 non è possibile.
  const near = [...rows].sort((a, b) => b.top10 - a.top10 || b.exact - a.exact || a.rankSum - b.rankSum).slice(0, 12)

  const totalNumbers = rows.length * 6
  const top1Total = rows.reduce((s, r) => s + r.exact, 0)
  const top3Total = rows.reduce((s, r) => s + r.top3, 0)
  const top5Total = rows.reduce((s, r) => s + r.top5, 0)
  const top10Total = rows.reduce((s, r) => s + r.top10, 0)
  const rankTotals = rows.reduce((acc, r) => {
    for (const [key, value] of Object.entries(r.distribution)) acc[key] += value
    return acc
  }, { r1: 0, r2_3: 0, r4_5: 0, r6_10: 0, r11_20: 0, r21p: 0 })

  const bands = [
    { key: 'top3', label: 'Rank 1–3', test: r => r <= 3 },
    { key: 'r4_10', label: 'Rank 4–10', test: r => r >= 4 && r <= 10 },
    { key: 'r11_20', label: 'Rank 11–20', test: r => r >= 11 && r <= 20 },
    { key: 'r21p', label: 'Rank 21+', test: r => r > 20 }
  ]
  const bandStats = bands.map(band => {
    const items = rows.flatMap(row => row.targetDetails.filter(d => band.test(d.rank)))
    const means = RULES.map((rule, r) => items.length ? items.reduce((sum, d) => sum + d.values[r], 0) / items.length : 0)
    return { ...band, count: items.length, pct: pct(items.length, totalNumbers), means }
  })
  const top3vs4_10 = RULES.map((rule, r) => {
    const a = rows.flatMap(row => row.targetDetails.filter(d => d.rank <= 3).map(d => d.values[r]))
    const b = rows.flatMap(row => row.targetDetails.filter(d => d.rank >= 4 && d.rank <= 10).map(d => d.values[r]))
    const meanA = a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0
    const meanB = b.length ? b.reduce((x, y) => x + y, 0) / b.length : 0
    return { ...rule, top3Mean: meanA, top10Mean: meanB, delta: meanA - meanB, absDelta: Math.abs(meanA - meanB), nTop3: a.length, nTop10: b.length }
  }).sort((a, b) => b.absDelta - a.absDelta)
  const top10NotTop3 = rows.flatMap(row => row.targetDetails.filter(d => d.rank >= 4 && d.rank <= 10).map(d => ({ ...d, date: row.date }))).sort((a, b) => a.rank - b.rank || a.baseRank - b.baseRank)
  const positionDiagnostics = POSITION_LABELS.map((label, p) => {
    const items = rows.map(row => row.targetDetails[p])
    const a = items.filter(d => d.rank <= 3), b = items.filter(d => d.rank >= 4 && d.rank <= 10)
    return { label, top3Count: a.length, top10Count: b.length, top3MeanRank: a.length ? a.reduce((s,d)=>s+d.rank,0)/a.length : 0, top10MeanRank: b.length ? b.reduce((s,d)=>s+d.rank,0)/b.length : 0 }
  })

  return {
    rows, exactRows, recurring, ruleStats, near, bandStats, top3vs4_10, top10NotTop3, positionDiagnostics,
    metrics: {
      totalNumbers,
      top1Total, top3Total, top5Total, top10Total,
      top1Pct: pct(top1Total, totalNumbers),
      top3Pct: pct(top3Total, totalNumbers),
      top5Pct: pct(top5Total, totalNumbers),
      top10Pct: pct(top10Total, totalNumbers),
      avgRank: totalNumbers ? rows.reduce((s, r) => s + r.rankSum, 0) / totalNumbers : 0,
      rankTotals
    }
  }
}

const ui = {
  input: { background: '#07101a', color: '#cfe2f1', border: '1px solid #18324a', borderRadius: 6, padding: '7px 9px' },
  button: { background: '#0b2234', color: '#bfeaff', border: '1px solid #1c5574', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 700 },
  h3: { fontSize: 14, color: '#8fa9bd', fontWeight: 600, margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#b9cddd' }
}

function SmallStat({ label, value, sub }) {
  return (
    <div style={{ ...styles.card, minWidth: 150, flex: 1 }}>
      <div style={{ color: '#6f91ad', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, marginTop: 5 }}>{value}</div>
      {sub && <div style={{ color: '#7290a8', fontSize: 12, marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function Weights({ weights }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
      {RULES.map((r, i) => (
        <span key={r.key} style={{
          border: '1px solid #18324a', borderRadius: 999, padding: '4px 8px',
          fontSize: 11, color: weights[i] > 0 ? '#c7d9e8' : '#59738b',
          background: weights[i] > 0 ? '#0b1724' : '#07101a'
        }}>
          {r.label} {weights[i]}
        </span>
      ))}
    </div>
  )
}

export default function Andamento({ draws }) {
  const hs = useMemo(() => historicalSeries(draws, 15), [draws])
  const [limit, setLimit] = useState(180)
  const [analysis, setAnalysis] = useState(null)
  const [running, setRunning] = useState(false)

  const columns = hs.dates.map(d => ({ label: d }))
  const lines = POSITION_LABELS.map((label, p) => ({
    label, color: P[p], values: hs.posValues[p], ranks: hs.posRanks[p]
  }))

  const runAnalysis = () => {
    setRunning(true)
    // Lasciamo al browser il tempo di aggiornare il bottone prima del calcolo.
    setTimeout(() => {
      const result = inverseAnalysis(draws, Math.min(MAX_ANALYSIS, Number(limit) || 180))
      setAnalysis(result)
      setRunning(false)
    }, 20)
  }

  const best = analysis?.near?.[0]
  const current = analysis?.rows?.[analysis.rows.length - 1]
  const exactCount = analysis?.exactRows?.length || 0
  const analyzedCount = analysis?.rows?.length || 0

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Andamento — ultime {hs.dates.length} estrazioni</h2>
        <p style={styles.caption}>
          Una linea tratteggiata per posizione (P1→P6, dal numero più basso al più alto in ogni
          estrazione). Sopra ogni punto il numero estratto, sotto il suo rank. Il Jolly è a rombi.
        </p>
        <PosizioniChart columns={columns} lines={lines} jolly={{ values: hs.jollyValues }} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Analisi inversa della vincente</h2>
        <p style={styles.caption}>
          Per ogni estrazione storica usa esclusivamente lo storico disponibile prima di quella data.
          Cerca quindi i pesi delle 6 regole che avrebbero portato i sei numeri reali al rank 1.
          È un'analisi retrospettiva: non è una previsione e non usa dati futuri.
        </p>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', margin: '14px 0' }}>
          <label style={{ color: '#8ba5ba', fontSize: 13 }}>Transizioni da analizzare</label>
          <select value={limit} onChange={e => setLimit(e.target.value)} style={{ ...ui.input, width: 100 }}>
            {[60, 120, 180, 240].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={runAnalysis} disabled={running} style={ui.button}>
            {running ? 'Analisi in corso…' : 'Avvia analisi'}
          </button>
          <span style={{ color: '#5e7b92', fontSize: 12 }}>Massimo {MAX_ANALYSIS}; il calcolo può richiedere qualche secondo.</span>
        </div>

        {!analysis && (
          <div style={{ ...styles.card, color: '#7893a9', lineHeight: 1.6 }}>
            Questa sezione non modifica il motore attuale. Serve a scoprire, guardando indietro,
            quali combinazioni di DECADE, HOT_V, CLUSTER_V, DELAY_V, VERTVOL e COLD_H hanno spiegato meglio
            la sestina successiva e se le stesse combinazioni si sono ripetute.
          </div>
        )}

        {analysis && (
          <>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <SmallStat label="Transizioni" value={analyzedCount} sub="T-1 → T" />
              <SmallStat label="6/6 esatti" value={exactCount} sub={pct(exactCount, analyzedCount)} />
              <SmallStat label="Miglior caso" value={best ? `${best.exact}/6` : '—'} sub={best ? `${fmtDate(best.date)} · rank ${best.ranks.join(' · ')}` : ''} />
              <SmallStat label="Ultima transizione" value={current ? `${current.exact}/6` : '—'} sub={current ? `${fmtDate(current.date)} · ottimizzato` : ''} />
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={ui.h3}>Qualità della selezione vs qualità dell'ordinamento</h3>
              <p style={styles.caption}>
                Qui separiamo due problemi diversi: quanto bene il modello porta i numeri vincenti nella rosa dei candidati
                e quanto bene riesce poi a ordinarli. Il caso 22/08/2026, per esempio, è 6/6 nella Top 10 ma solo 3/6 al rank 1.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <SmallStat label="Rank 1" value={`${analysis.metrics.top1Pct}`} sub={`${analysis.metrics.top1Total}/${analysis.metrics.totalNumbers} numeri`} />
                <SmallStat label="Top 3" value={`${analysis.metrics.top3Pct}`} sub={`${analysis.metrics.top3Total}/${analysis.metrics.totalNumbers} numeri`} />
                <SmallStat label="Top 5" value={`${analysis.metrics.top5Pct}`} sub={`${analysis.metrics.top5Total}/${analysis.metrics.totalNumbers} numeri`} />
                <SmallStat label="Top 10" value={`${analysis.metrics.top10Pct}`} sub={`${analysis.metrics.top10Total}/${analysis.metrics.totalNumbers} numeri`} />
                <SmallStat label="Rank medio" value={analysis.metrics.avgRank.toFixed(1)} sub="sui 6 numeri vincenti" />
              </div>
              <div style={{ ...styles.card, marginTop: 10 }}>
                <div style={{ color: '#8fa9bd', fontSize: 12, marginBottom: 8 }}>Distribuzione dei rank dei numeri vincenti</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: 8 }}>
                  {[
                    ['1', analysis.metrics.rankTotals.r1],
                    ['2–3', analysis.metrics.rankTotals.r2_3],
                    ['4–5', analysis.metrics.rankTotals.r4_5],
                    ['6–10', analysis.metrics.rankTotals.r6_10],
                    ['11–20', analysis.metrics.rankTotals.r11_20],
                    ['21+', analysis.metrics.rankTotals.r21p]
                  ].map(([label, value]) => (
                    <div key={label} style={{ border: '1px solid #18324a', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ color: '#6f91ad', fontSize: 11 }}>RANK {label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>{value}</div>
                      <div style={{ color: '#6f91ad', fontSize: 11 }}>{pct(value, analysis.metrics.totalNumbers)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Diagnosi: cosa distingue Top 3 da Rank 4–10?</h3>
              <p style={styles.caption}>Confronta i valori normalizzati delle sei variabili sui numeri vincenti che l'ottimizzazione porta in Top 3 rispetto a quelli che restano in Rank 4–10. Serve a capire se manca un criterio di ordinamento, senza modificare il motore.</p>
              <div style={{ overflowX: 'auto' }}><table style={ui.table}>
                <thead><tr><th>Fascia</th><th>N.</th><th>%</th>{RULES.map(r=><th key={r.key}>{r.label}</th>)}</tr></thead>
                <tbody>{analysis.bandStats.map(b=><tr key={b.key}><td><b>{b.label}</b></td><td>{b.count}</td><td>{b.pct}</td>{b.means.map((v,i)=><td key={RULES[i].key}>{v.toFixed(3)}</td>)}</tr>)}</tbody>
              </table></div>
              <div style={{ marginTop: 14, overflowX: 'auto' }}><table style={ui.table}>
                <thead><tr><th>Variabile</th><th>Media Top 3</th><th>Media Rank 4–10</th><th>Δ</th><th>Campioni</th></tr></thead>
                <tbody>{analysis.top3vs4_10.map(r=><tr key={r.key}><td><b>{r.label}</b></td><td>{r.top3Mean.toFixed(3)}</td><td>{r.top10Mean.toFixed(3)}</td><td>{r.delta>=0?'+':''}{r.delta.toFixed(3)}</td><td>{r.nTop3} / {r.nTop10}</td></tr>)}</tbody>
              </table></div>
              <p style={styles.caption}>Δ positivo = valore medio più alto nei Top 3; Δ negativo = valore medio più alto nei Rank 4–10. È un confronto descrittivo, non causale.</p>
              <div style={{ marginTop: 14 }}><h3 style={ui.h3}>Top 10 ma non Top 3 — casi da studiare</h3>
                <div style={{ overflowX: 'auto' }}><table style={ui.table}><thead><tr><th>Data</th><th>Pos.</th><th>Numero</th><th>Rank</th><th>Base</th>{RULES.map(r=><th key={r.key}>{r.label}</th>)}</tr></thead>
                <tbody>{analysis.top10NotTop3.slice(0,30).map((d,i)=><tr key={`${d.date}-${d.position}-${i}`}><td>{d.date}</td><td>P{d.position+1}</td><td><b>{d.number}</b></td><td>{d.rank}</td><td>{d.baseRank}</td>{d.values.map((v,j)=><td key={RULES[j].key}>{v.toFixed(3)}</td>)}</tr>)}</tbody></table></div>
                <p style={styles.caption}>I primi 30 casi in cui il numero vincente è nella Top 10 ma non nella Top 3. Sono i casi più utili per cercare il criterio mancante di ordinamento.</p>
              </div>
              <div style={{ marginTop: 14, overflowX: 'auto' }}><table style={ui.table}><thead><tr><th>Posizione</th><th>Top 3</th><th>Rank 4–10</th><th>Rank medio Top 3</th><th>Rank medio 4–10</th></tr></thead><tbody>{analysis.positionDiagnostics.map(p=><tr key={p.label}><td><b>{p.label}</b></td><td>{p.top3Count}</td><td>{p.top10Count}</td><td>{p.top3MeanRank.toFixed(2)}</td><td>{p.top10MeanRank.toFixed(2)}</td></tr>)}</tbody></table></div>
            </div>

            <div style={{ marginTop: 18 }}>
              <h3 style={ui.h3}>Quali variabili vengono scelte?</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={ui.table}>
                  <thead>
                    <tr>
                      <th>Regola</th><th>Attiva</th><th>Su 6/6</th><th>Frequenza</th><th>Peso medio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.ruleStats
                      .sort((a, b) => b.activeExact - a.activeExact || b.active - a.active)
                      .map(r => (
                        <tr key={r.key}>
                          <td><b>{r.label}</b></td>
                          <td>{r.active}/{analyzedCount}</td>
                          <td>{r.activeExact}/{exactCount || 0}</td>
                          <td>{r.activePct}</td>
                          <td>{r.avgWeight.toFixed(2)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p style={styles.caption}>
                “Attiva” significa peso &gt; 0 nel setting ottimizzato. Non significa che la regola sia causalmente
                responsabile della vincente: serve a misurare quali variabili vengono selezionate più spesso dal fitting.
              </p>
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Configurazioni 6/6 ricorrenti</h3>
              {analysis.recurring.length === 0 ? (
                <div style={{ ...styles.card, color: '#7e96a9' }}>
                  Nessun 6/6 trovato nelle ultime {analyzedCount} transizioni con questa griglia di pesi.
                  I casi quasi perfetti sotto sono comunque utili per capire come correggere i rank.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {analysis.recurring.slice(0, 10).map((r, i) => (
                    <div key={r.fp} style={styles.card}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <b>Configurazione #{i + 1} — {r.occurrences.length} occorrenze</b>
                        <span style={{ color: '#7691a7', fontSize: 12 }}>
                          {r.occurrences.map(o => o.date).join(' · ')}
                        </span>
                      </div>
                      <Weights weights={r.weights} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Migliori transizioni: selezione riuscita, ordinamento da migliorare</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={ui.table}>
                  <thead>
                    <tr><th>Data</th><th>Vincente</th><th>Rank ottimizzato</th><th>Top 3</th><th>Top 5</th><th>Top 10</th><th>Rank 1</th><th>Setting</th></tr>
                  </thead>
                  <tbody>
                    {analysis.near.map(row => (
                      <tr key={row.index}>
                        <td>{row.date}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{row.target.join(' · ')}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{row.ranks.join(' · ')}</td>
                        <td>{row.top3}/6</td>
                        <td>{row.top5}/6</td>
                        <td><b>{row.top10}/6</b></td>
                        <td><b>{row.exact}/6</b></td>
                        <td><Weights weights={row.weights} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Lettura dell'ultima transizione analizzata</h3>
              {current && (
                <div style={styles.card}>
                  <div style={{ color: '#9db5c8', fontSize: 13 }}>
                    Per <b>{current.date}</b>, usando solo le estrazioni precedenti, la sestina reale era:
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, margin: '8px 0' }}>{current.target.join(' · ')}</div>
                  <div style={{ color: '#89a3b8', fontSize: 13 }}>Rank ottimizzati: <b>{current.ranks.join(' · ')}</b> → <b>{current.exact}/6</b> al rank 1.</div>
                  <Weights weights={current.weights} />
                  <div style={{ marginTop: 10, color: '#657f95', fontSize: 12 }}>
                    Il confronto con i rank base è {current.baseRanks.join(' · ')}. Se l'ottimizzazione li abbassa in modo sistematico,
                    il passo successivo può essere una ricalibrazione delle funzioni/rank, non semplicemente dei pesi.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
