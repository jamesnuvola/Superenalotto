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


// TEST R — ricostruzione della base Rank.
// L'idea è separare due informazioni: comportamento temporale del numero
// (breve/medio/lungo + ritmo di ritorno) e comportamento specifico della
// posizione P1..P6. Tutto è calcolato walk-forward: per il draw T si usa solo
// lo storico fino a T-1. Il test è diagnostico e NON modifica il motore.
const R_WINDOWS = [10, 30, 100]
const R_FREQ_WEIGHTS = [0.5, 0.3, 0.2]

function percentileArray(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0] || a[1] - b[1])
  const out = Array(values.length).fill(0)
  const den = Math.max(1, values.length - 1)
  order.forEach(([_, i], rank) => { out[i] = 1 - rank / den })
  return out
}

function rContextData(history, position, globalContext) {
  const counts = R_WINDOWS.map(() => new Map())
  const source = globalContext
    ? history.map(d => d[2])
    : history.map(d => [d[2][position]])

  for (let w = 0; w < R_WINDOWS.length; w++) {
    const recent = source.slice(-R_WINDOWS[w])
    for (const nums of recent) for (const n of nums) counts[w].set(n, (counts[w].get(n) || 0) + 1)
  }

  const lastSeen = new Map()
  const indices = new Map()
  for (let i = 0; i < source.length; i++) {
    for (const n of source[i]) {
      lastSeen.set(n, i)
      if (!indices.has(n)) indices.set(n, [])
      indices.get(n).push(i)
    }
  }

  const freq = new Map()
  const ret = new Map()
  for (let n = 1; n <= 90; n++) {
    // Ogni orizzonte viene normalizzato separatamente: 10/30/100 draw
    // non vengono fatti competere per il solo numero di occorrenze.
    let f = 0
    for (let w = 0; w < R_WINDOWS.length; w++) {
      const maxCount = Math.max(1, ...counts[w].values())
      f += R_FREQ_WEIGHTS[w] * ((counts[w].get(n) || 0) / maxCount)
    }
    freq.set(n, f)

    const idx = indices.get(n) || []
    if (!idx.length) { ret.set(n, 0.5); continue }
    const delay = history.length - 1 - lastSeen.get(n)
    const gaps = []
    for (let i = 1; i < idx.length; i++) gaps.push(idx[i] - idx[i - 1])
    const med = gaps.length ? gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] : Math.max(3, delay + 1)
    ret.set(n, Math.exp(-Math.abs(delay - med) / (Math.max(3, med) * 0.75)))
  }
  return { freq, ret }
}

function rProfile(history, position, globalContext) {
  const { freq, ret } = rContextData(history, position, globalContext)
  const raw = []
  for (let n = 1; n <= 90; n++) raw.push(0.65 * freq.get(n) + 0.35 * ret.get(n))
  return percentileArray(raw)
}

function rRankSet(history, position, mode, alpha = 0.3) {
  const global = rProfile(history, position, true)
  const pos = rProfile(history, position, false)
  const base = percentileArray([...rankedCandidates(history, position)].map(x => x[1]))
  const byNumber = new Map()
  rankedCandidates(history, position).forEach(([n], i) => byNumber.set(n, base[i]))

  const score = new Map()
  for (let n = 1; n <= 90; n++) {
    if (mode === 'temporal') score.set(n, global[n - 1])
    else if (mode === 'position') score.set(n, pos[n - 1])
    else if (mode === 'hybrid') score.set(n, 0.5 * global[n - 1] + 0.5 * pos[n - 1])
    else if (mode === 'correction') score.set(n, (byNumber.get(n) || 0) + alpha * pos[n - 1])
    else score.set(n, byNumber.get(n) || 0)
  }
  return score
}

function rRank(scoreMap, number) {
  const sorted = [...scoreMap.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])
  const i = sorted.findIndex(([n]) => n === number)
  return i >= 0 ? i + 1 : 91
}



// TEST R4 — BOOST ADATTIVO DEL RANK.
// L'idea è usare i risultati R2 senza imporre un unico alpha: la correzione
// posizionale cambia in funzione della fascia del Rank base. In più testiamo
// un piccolo boost non lineare sui candidati già forti e un modulatore di regime.
const R4_CONFIGS = [
  { key:'A', label:'Conservativo', bands:[0.20,0.60,0.50,0.30,0.10], beta:0, regime:1 },
  { key:'B', label:'Boost forte Top3', bands:[0.20,0.70,0.60,0.30,0.10], beta:0, regime:1 },
  { key:'C', label:'Boost forte + non lineare', bands:[0.20,0.70,0.60,0.30,0.10], beta:0.75, regime:1 },
  { key:'D', label:'Boost bilanciato', bands:[0.30,0.60,0.50,0.30,0.10], beta:0.75, regime:1 },
  { key:'E', label:'Top3 + regime', bands:[0.20,0.70,0.60,0.30,0.10], beta:0.75, regime:1.15 },
  { key:'F', label:'Top3 prudente + regime', bands:[0.20,0.60,0.50,0.25,0.10], beta:0.75, regime:1.15 }
]

function r4BandAlpha(baseRank) {
  if (baseRank <= 1) return 0
  if (baseRank <= 3) return 1
  if (baseRank <= 5) return 2
  if (baseRank <= 10) return 3
  return 4
}

function r4ScoreMap(history, position, config) {
  const rc = rankedCandidates(history, position)
  const baseVals = percentileArray(rc.map(x => x[1]))
  const base = new Map()
  rc.forEach(([n], i) => base.set(n, baseVals[i]))
  const pos = rProfile(history, position, false)
  const meanBaseRank = POSITION_LABELS.reduce((sum, _, p) => {
    const r = rankedCandidates(history, p)
    return sum + (r.length ? 1 : 1)
  }, 0) / 6
  // Il modulatore di regime usa la media dei Rank effettivi dell'ultima
  // estrazione disponibile: se il sistema è molto compatto, il boost viene
  // leggermente attenuato/aumentato. Non usa il target futuro.
  const last = history.length ? history[history.length - 1] : null
  const lastRanks = last ? POSITION_LABELS.map((_, p) => {
    const ar = rankedCandidates(history.slice(0, Math.max(1, history.length - 1)), p)
    const n = last[2][p]
    const i = ar.findIndex(([x]) => x === n)
    return i >= 0 ? i + 1 : ar.length + 1
  }) : []
  const lastMean = lastRanks.length ? lastRanks.reduce((a,b)=>a+b,0)/lastRanks.length : 22
  const regimeFactor = config.regime === 1 ? 1 : (lastMean < 18 ? config.regime : (lastMean > 28 ? 2 - config.regime : 1))
  const scores = []
  for (let n = 1; n <= 90; n++) {
    const b = base.get(n) || 0
    const band = r4BandAlpha(baseRankFromPercentile(b, baseVals.length))
    const a = config.bands[band]
    const q = pos[n - 1] || 0
    const nonlinear = config.beta * q * b * (1 - b)
    scores.push([n, b + regimeFactor * (a * q + nonlinear)])
  }
  scores.sort((a,b)=>b[1]-a[1] || a[0]-b[0])
  return new Map(scores.map(([n],i)=>[n,i+1]))
}

function baseRankFromPercentile(v, size) {
  const den = Math.max(1, size - 1)
  return 1 + (1 - v) * den
}

function r4Metrics(rows) {
  const flat = rows.flat()
  return {
    avg: flat.reduce((a,b)=>a+b,0)/flat.length,
    top1: flat.filter(x=>x===1).length/flat.length,
    top3: flat.filter(x=>x<=3).length/flat.length,
    top5: flat.filter(x=>x<=5).length/flat.length,
    top10: flat.filter(x=>x<=10).length/flat.length
  }
}

function r4Analysis(draws, limit = 240) {
  const start = Math.max(120, draws.length - limit)
  const rows = Object.fromEntries(R4_CONFIGS.map(c=>[c.key, []]))
  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0,t)
    for (const config of R4_CONFIGS) {
      const ranks=[]
      for (let p=0;p<6;p++) ranks.push(r4ScoreMap(history,p,config).get(draws[t][2][p]) || 91)
      rows[config.key].push(ranks)
    }
  }
  const blocks=[
    {key:'early',from:0,to:Math.floor((draws.length-start)/3)},
    {key:'middle',from:Math.floor((draws.length-start)/3),to:Math.floor(2*(draws.length-start)/3)},
    {key:'recent',from:Math.floor(2*(draws.length-start)/3),to:draws.length-start}
  ]
  const metrics=Object.fromEntries(R4_CONFIGS.map(c=>[c.key,r4Metrics(rows[c.key])]))
  const stability=Object.fromEntries(R4_CONFIGS.map(c=>[c.key,blocks.map(b=>r4Metrics(rows[c.key].slice(b.from,b.to)))]))
  const history=draws.slice(0,draws.length-1), current={}
  for(const c of R4_CONFIGS) current[c.key]=POSITION_LABELS.map((_,p)=>r4ScoreMap(history,p,c).get(draws[draws.length-1][2][p])||91)
  const base = rMetrics([history.length ? POSITION_LABELS.map((_,p)=>{
    const ar=rankedCandidates(draws.slice(0,draws.length-1),p), n=draws[draws.length-1][2][p], i=ar.findIndex(([x])=>x===n); return i+1
  }) : []])
  return {start,draws:draws.length-start,configs:R4_CONFIGS,metrics,stability,current,base}
}

// TEST R2 — calibrazione della correzione posizionale.
// Non cerchiamo il miglior alpha sul risultato finale: confrontiamo una griglia
// di correzioni fissate e ne controlliamo la stabilita' nei tre blocchi temporali.
const R2_ALPHAS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6]

function r2Analysis(draws, limit = 240) {
  const start = Math.max(120, draws.length - limit)
  const rows = []
  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    const target = draws[t][2]
    const row = { date: draws[t][0], ranks: {} }
    for (const alpha of R2_ALPHAS) {
      const ranks = []
      for (let p = 0; p < 6; p++) {
        const score = rRankSet(history, p, 'correction', alpha)
        ranks.push(rRank(score, target[p]))
      }
      row.ranks[alpha] = ranks
    }
    rows.push(row)
  }

  const metrics = {}
  for (const alpha of R2_ALPHAS) {
    const flat = rows.flatMap(r => r.ranks[alpha])
    metrics[alpha] = {
      avg: flat.reduce((a,b)=>a+b,0)/flat.length,
      top1: flat.filter(r=>r===1).length/flat.length,
      top3: flat.filter(r=>r<=3).length/flat.length,
      top5: flat.filter(r=>r<=5).length/flat.length,
      top10: flat.filter(r=>r<=10).length/flat.length,
    }
  }

  const n = rows.length
  const blocks = [
    { key:'early', from:0, to:Math.floor(n/3) },
    { key:'middle', from:Math.floor(n/3), to:Math.floor(2*n/3) },
    { key:'recent', from:Math.floor(2*n/3), to:n }
  ]
  const stability = Object.fromEntries(R2_ALPHAS.map(alpha => [alpha, blocks.map(b => {
    const flat = rows.slice(b.from,b.to).flatMap(r=>r.ranks[alpha])
    return { ...b, avg:flat.reduce((a,x)=>a+x,0)/flat.length, top3:flat.filter(r=>r<=3).length/flat.length, top5:flat.filter(r=>r<=5).length/flat.length, top10:flat.filter(r=>r<=10).length/flat.length }
  })]))

  const base = rAnalysis(draws, limit).metrics.baseline
  const bestStable = [...R2_ALPHAS].sort((a,b)=>{
    const sa=stability[a].map(x=>x.top3), sb=stability[b].map(x=>x.top3)
    const va=Math.max(...sa)-Math.min(...sa), vb=Math.max(...sb)-Math.min(...sb)
    const da=metrics[a].top3-base.top3, db=metrics[b].top3-base.top3
    return (db-vb*0.25)-(da-va*0.25)
  })[0]

  const history = draws.slice(0, draws.length-1)
  const current = {}
  for (const alpha of R2_ALPHAS) current[alpha]=POSITION_LABELS.map((_,p)=>rRank(rRankSet(history,p,'correction',alpha), draws[draws.length-1][2][p]))

  return { start, draws:rows.length, alphas:R2_ALPHAS, metrics, stability, base, bestStable, current }
}

function rMetrics(rows) {
  const flat = rows.flat()
  const n = flat.length
  return {
    avg: n ? flat.reduce((a, b) => a + b, 0) / n : 0,
    top1: n ? flat.filter(r => r === 1).length / n : 0,
    top3: n ? flat.filter(r => r <= 3).length / n : 0,
    top5: n ? flat.filter(r => r <= 5).length / n : 0,
    top10: n ? flat.filter(r => r <= 10).length / n : 0
  }
}

function rAnalysis(draws, limit = 240) {
  const start = Math.max(120, draws.length - limit)
  const modes = [
    { key: 'baseline', label: 'Rank attuale' },
    { key: 'temporal', label: 'Rank temporale' },
    { key: 'position', label: 'Rank per posizione' },
    { key: 'hybrid', label: 'Temporale + posizione' },
    { key: 'correction', label: 'Attuale + correzione posizione' }
  ]
  const data = Object.fromEntries(modes.map(m => [m.key, []]))
  const current = Object.fromEntries(modes.map(m => [m.key, []]))

  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    for (const mode of modes) {
      const ranks = []
      for (let p = 0; p < 6; p++) ranks.push(rRank(rRankSet(history, p, mode.key), draws[t][2][p]))
      data[mode.key].push(ranks)
    }
  }

  const blocks = [
    { key: 'early', from: 0, to: Math.floor((draws.length - start) / 3) },
    { key: 'middle', from: Math.floor((draws.length - start) / 3), to: Math.floor(2 * (draws.length - start) / 3) },
    { key: 'recent', from: Math.floor(2 * (draws.length - start) / 3), to: draws.length - start }
  ]
  const stability = {}
  for (const mode of modes) stability[mode.key] = blocks.map(b => ({ ...b, metrics: rMetrics(data[mode.key].slice(b.from, b.to)) }))

  for (const mode of modes) {
    const scoreMap = rRankSet(draws.slice(0, draws.length), 0, mode.key)
    // Il blocco current viene ricalcolato per ogni posizione usando lo storico
    // pre-draw dell'ultima estrazione: nessun dato della target viene usato.
    current[mode.key] = []
    const history = draws.slice(0, draws.length - 1)
    for (let p = 0; p < 6; p++) current[mode.key].push(rRank(rRankSet(history, p, mode.key), draws[draws.length - 1][2][p]))
  }

  return { start, draws: draws.length - start, modes, data, metrics: Object.fromEntries(modes.map(m => [m.key, rMetrics(data[m.key])])), stability, current }
}

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

function scoredCandidates(features, position, weights) {
  const candidates = new Set()
  for (let r = 0; r < RULES.length; r++) {
    for (const n of features[position][r].keys()) candidates.add(n)
  }
  const scored = []
  for (const n of candidates) {
    let score = 0
    const values = []
    for (let r = 0; r < RULES.length; r++) {
      const v = features[position][r].get(n) || 0
      values.push(v)
      score += v * weights[r]
    }
    scored.push({ number: n, score, values })
  }
  scored.sort((a, b) => b.score - a.score || a.number - b.number)
  return scored
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

function transformFeatures(features, transforms) {
  return features.map(position => position.map((map, r) => {
    const fn = transforms[r] || (x => x)
    const out = new Map()
    for (const [n, v] of map.entries()) out.set(n, Math.max(0, fn(v)))
    return out
  }))
}

function optimizeRestricted(features, target, allowed, fixed = {}) {
  let weights = RULES.map((_, r) => Object.prototype.hasOwnProperty.call(fixed, r) ? fixed[r] : (allowed.includes(r) ? 1 : 0))
  let best = objective(features, target, weights)
  for (let pass = 0; pass < 2; pass++) {
    let changed = false
    for (const r of allowed) {
      let localBest = best
      let localWeight = weights[r]
      for (const w of WEIGHTS) {
        const candidate = [...weights]
        candidate[r] = w
        const result = objective(features, target, candidate)
        if (result.score > localBest.score) { localBest = result; localWeight = w }
      }
      if (localWeight !== weights[r]) { weights[r] = localWeight; best = localBest; changed = true }
    }
    if (!changed) break
  }
  return { weights, ...objective(features, target, weights) }
}

function aggregateVariant(rows, key, rankField = 'ranks') {
  const ranks = rows.flatMap(r => r[key]?.[rankField] || [])
  const n = ranks.length
  return {
    key,
    rank1: ranks.filter(r => r === 1).length,
    top3: ranks.filter(r => r <= 3).length,
    top5: ranks.filter(r => r <= 5).length,
    top10: ranks.filter(r => r <= 10).length,
    avgRank: n ? ranks.reduce((a,b)=>a+b,0)/n : 0,
    total: n
  }
}

function runRankingTests(draws, limit) {
  const start = Math.max(1, draws.length - limit)
  const rows = []
  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    const target = draws[t][2]
    const features = buildFeatures(history)
    const baseline = optimizeWeights(features, target)

    // A: fine-ranking puro. Elimina VERTVOL e COLD_H dalla fase di ordinamento.
    const fine = optimizeRestricted(features, target, [0,1,2,3], {4:0, 5:0})

    // B: sensibilità a COLD_H. Manteniamo il setting ottimizzato di base e
    // cambiamo soltanto l'impatto di COLD_H, così il test non viene vanificato
    // dal ri-ottimizzatore che potrebbe compensare il moltiplicatore.
    const coldVariants = {}
    for (const factor of [1, 0.75, 0.5, 0.25, 0]) {
      const w = [...baseline.weights]
      w[5] *= factor
      coldVariants[`cold_${factor}`] = { ranks: objective(features, target, w).ranks, weights: w }
    }

    // C: non linearità su HOT_V e DELAY_V. Ottimizziamo i pesi sulla versione
    // trasformata per vedere se valori alti meritano una spinta più che lineare.
    const linear = transformFeatures(features, {1:x=>x, 3:x=>x})
    const hot2 = transformFeatures(features, {1:x=>x*x, 3:x=>x})
    const delay2 = transformFeatures(features, {1:x=>x, 3:x=>x*x})
    const hotSqrt = transformFeatures(features, {1:x=>Math.sqrt(x), 3:x=>x})
    const delaySqrt = transformFeatures(features, {1:x=>x, 3:x=>Math.sqrt(x)})
    const nonlinear = {
      hot2: optimizeWeights(hot2, target),
      delay2: optimizeWeights(delay2, target),
      hotSqrt: optimizeWeights(hotSqrt, target),
      delaySqrt: optimizeWeights(delaySqrt, target),
      linear: baseline
    }

    rows.push({ index:t, date:draws[t][0], baseline, fine, coldVariants, nonlinear })
  }

  const variants = [
    { key:'baseline', label:'ATTUALE', get:r=>r.baseline },
    { key:'fine', label:'A · FINE RANKER', get:r=>r.fine },
    ...[1,0.75,0.5,0.25,0].map(f => ({ key:`cold_${f}`, label:`B · COLD_H × ${f}`, get:r=>r.coldVariants[`cold_${f}`] })),
    { key:'hot2', label:'C · HOT_V²', get:r=>r.nonlinear.hot2 },
    { key:'delay2', label:'C · DELAY_V²', get:r=>r.nonlinear.delay2 },
    { key:'hotSqrt', label:'C · √HOT_V', get:r=>r.nonlinear.hotSqrt },
    { key:'delaySqrt', label:'C · √DELAY_V', get:r=>r.nonlinear.delaySqrt }
  ]
  const metrics = variants.map(v => {
    const ranks = rows.flatMap(r => v.get(r).ranks)
    const n = ranks.length
    return { ...v, rank1:ranks.filter(x=>x===1).length, top3:ranks.filter(x=>x<=3).length, top5:ranks.filter(x=>x<=5).length, top10:ranks.filter(x=>x<=10).length, avgRank:n?ranks.reduce((a,b)=>a+b,0)/n:0, total:n }
  })
  const baseline = metrics[0]
  return { rows, metrics, baseline }
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

function pairwiseRankingTest(draws, limit) {
  const start = Math.max(1, draws.length - limit)
  const comparisons = []
  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    const target = draws[t][2]
    const features = buildFeatures(history)
    const baseline = optimizeWeights(features, target)
    for (let p = 0; p < 6; p++) {
      const winner = target[p]
      const ranked = scoredCandidates(features, p, baseline.weights)
      const wi = ranked.findIndex(x => x.number === winner)
      if (wi < 0 || wi < 3 || wi > 9) continue
      const prev = ranked[wi - 1]
      const top = ranked[0]
      comparisons.push({
        date: draws[t][0], position: p, number: winner, rank: wi + 1,
        winnerValues: features[p].map(m => m.get(winner) || 0),
        prevValues: prev.values, prevNumber: prev.number, prevScore: prev.score,
        winnerScore: ranked[wi].score,
        topValues: top.values, topNumber: top.number, topScore: top.score,
        gaps: features[p].map((m, r) => (m.get(winner) || 0) - (prev.values[r] || 0)),
        topGaps: features[p].map((m, r) => (m.get(winner) || 0) - (top.values[r] || 0))
      })
    }
  }

  const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0
  const featureStats = RULES.map((rule, r) => {
    const gaps = comparisons.map(c => c.gaps[r])
    const topGaps = comparisons.map(c => c.topGaps[r])
    const winnerHigher = gaps.filter(x => x > 0).length
    const winnerLower = gaps.filter(x => x < 0).length
    return {
      ...rule, meanGap: mean(gaps), meanTopGap: mean(topGaps),
      winnerHigher, winnerLower, higherPct: pct(winnerHigher, comparisons.length),
      lowerPct: pct(winnerLower, comparisons.length)
    }
  }).sort((a,b) => b.meanGap - a.meanGap)

  const rankBuckets = [
    {label:'Rank 4', test:r=>r===4},
    {label:'Rank 5–6', test:r=>r>=5&&r<=6},
    {label:'Rank 7–10', test:r=>r>=7&&r<=10}
  ].map(b => {
    const items = comparisons.filter(c => b.test(c.rank))
    return { ...b, count:items.length, avgRank:mean(items.map(c=>c.rank)),
      meanScoreGap:mean(items.map(c=>c.winnerScore-c.prevScore)) }
  })

  const topCases = [...comparisons].sort((a,b)=>a.rank-b.rank).slice(0, 30)
  return { comparisons, featureStats, rankBuckets, topCases }
}


const INTERACTION_PAIRS = [
  [0,1], [0,2], [0,3], [0,4], [0,5],
  [1,2], [1,3], [1,4], [1,5],
  [2,3], [2,4], [2,5],
  [3,4], [3,5],
  [4,5]
]

function interactionAnalysis(draws, limit) {
  const start = Math.max(1, draws.length - limit)
  const items = []

  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    const target = draws[t][2]
    const features = buildFeatures(history)
    const baseline = optimizeWeights(features, target)
    for (let p = 0; p < 6; p++) {
      const winner = target[p]
      const rank = baseline.ranks[p]
      if (rank < 1) continue
      const values = features[p].map(m => m.get(winner) || 0)
      items.push({ date: draws[t][0], position: p, number: winner, rank, values })
    }
  }

  const mean = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0
  const label = (a,b) => `${RULES[a].label} × ${RULES[b].label}`

  const pairs = INTERACTION_PAIRS.map(([a,b]) => {
    const top3 = items.filter(x => x.rank <= 3)
    const r4_10 = items.filter(x => x.rank >= 4 && x.rank <= 10)
    const top3Vals = top3.map(x => x.values[a] * x.values[b])
    const r4Vals = r4_10.map(x => x.values[a] * x.values[b])
    const allVals = items.map(x => x.values[a] * x.values[b])
    const meanTop3 = mean(top3Vals)
    const meanR4 = mean(r4Vals)
    return {
      a, b, key:`${RULES[a].key}__${RULES[b].key}`, label:label(a,b),
      meanTop3, meanR4, delta:meanTop3-meanR4,
      meanAll:mean(allVals),
      top3N:top3Vals.length, r4N:r4Vals.length
    }
  }).sort((x,y) => y.delta - x.delta)

  // Un controllo complementare: fra i casi Top 10 ma non Top 3, misura
  // quali interazioni sono più spesso alte nel vincente rispetto al concorrente
  // immediatamente sopra. Non modifica il ranking.
  const direct = []
  for (let t = start; t < draws.length; t++) {
    const history = draws.slice(0, t)
    const target = draws[t][2]
    const features = buildFeatures(history)
    const baseline = optimizeWeights(features, target)
    for (let p = 0; p < 6; p++) {
      const winner = target[p]
      const ranked = scoredCandidates(features, p, baseline.weights)
      const wi = ranked.findIndex(x => x.number === winner)
      if (wi < 3 || wi > 9) continue
      const prev = ranked[wi - 1]
      const winnerValues = features[p].map(m => m.get(winner) || 0)
      const gaps = INTERACTION_PAIRS.map(([a,b]) => winnerValues[a] * winnerValues[b] - prev.values[a] * prev.values[b])
      direct.push({ date:draws[t][0], position:p, number:winner, rank:wi+1, prevNumber:prev.number, gaps })
    }
  }

  const directPairs = INTERACTION_PAIRS.map(([a,b], i) => {
    const gaps = direct.map(x => x.gaps[i])
    const positive = gaps.filter(x => x > 0).length
    const negative = gaps.filter(x => x < 0).length
    return { key:`${RULES[a].key}__${RULES[b].key}`, label:label(a,b), meanGap:mean(gaps), positive, negative, positivePct:pct(positive,direct.length), negativePct:pct(negative,direct.length) }
  }).sort((x,y) => y.meanGap - x.meanGap)

  return { items, pairs, direct, directPairs }
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

  const rankingTests = runRankingTests(draws, limit)
  const pairwiseTest = pairwiseRankingTest(draws, limit)
  const interactionTest = interactionAnalysis(draws, limit)

  return {
    rows, exactRows, recurring, ruleStats, near, bandStats, top3vs4_10, top10NotTop3, positionDiagnostics, rankingTests, pairwiseTest, interactionTest,
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
  const [rAnalysisState, setRAnalysisState] = useState(null)
  const [rRunning, setRRunning] = useState(false)
  const [r2AnalysisState, setR2AnalysisState] = useState(null)
  const [r2Running, setR2Running] = useState(false)
  const [r4AnalysisState, setR4AnalysisState] = useState(null)
  const [r4Running, setR4Running] = useState(false)

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

  const runR2Analysis = () => {
    setR2Running(true)
    setTimeout(() => {
      setR2AnalysisState(r2Analysis(draws, 240))
      setR2Running(false)
    }, 20)
  }

  const runR4Analysis = () => {
    setR4Running(true)
    setTimeout(() => {
      setR4AnalysisState(r4Analysis(draws, 240))
      setR4Running(false)
    }, 20)
  }

  const runRAnalysis = () => {
    setRRunning(true)
    setTimeout(() => {
      setRAnalysisState(rAnalysis(draws, 240))
      setRRunning(false)
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

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Test A/B/C — ricalibrazione dell'ordinamento</h3>
              <p style={styles.caption}>
                Questi test non modificano il motore. Confrontano l'attuale ranking con: A) un fine-ranker che esclude VERTVOL e COLD_H,
                B) diverse intensità di COLD_H mantenendo fissi gli altri pesi ottimizzati, C) trasformazioni non lineari di HOT_V e DELAY_V.
                Sono ancora test retrospettivi: servono per scegliere l'ipotesi da validare successivamente fuori campione.
              </p>
              <div style={{ overflowX:'auto' }}>
                <table style={ui.table}>
                  <thead><tr><th>Test</th><th>Rank 1</th><th>Top 3</th><th>Top 5</th><th>Top 10</th><th>Rank medio</th><th>Δ Top 3</th><th>Δ Top 10</th></tr></thead>
                  <tbody>{analysis.rankingTests.metrics.map(m => {
                    const b = analysis.rankingTests.baseline
                    return <tr key={m.key}>
                      <td><b>{m.label}</b></td><td>{pct(m.rank1,m.total)}</td><td>{pct(m.top3,m.total)}</td><td>{pct(m.top5,m.total)}</td><td>{pct(m.top10,m.total)}</td><td>{m.avgRank.toFixed(2)}</td>
                      <td>{m.key==='baseline'?'—':`${m.top3-b.top3>=0?'+':''}${((m.top3-b.top3)/b.total*100).toFixed(1)} pt`}</td>
                      <td>{m.key==='baseline'?'—':`${m.top10-b.top10>=0?'+':''}${((m.top10-b.top10)/b.total*100).toFixed(1)} pt`}</td>
                    </tr>
                  })}</tbody>
                </table>
              </div>
              <div style={{ ...styles.card, marginTop:10, color:'#91a8ba', lineHeight:1.55 }}>
                <b style={{color:'#c7d9e8'}}>Come leggere il test:</b> la riga migliore non è automaticamente la soluzione finale.
                Se A aumenta Top 3 senza perdere Top 10, abbiamo evidenza a favore di un ranking a due stadi.
                Se B migliora soprattutto Top 3 riducendo COLD_H, COLD_H potrebbe essere utile per la selezione ma controproducente nel fine-ranking.
                Se C migliora, la forma della funzione potrebbe essere più importante del semplice peso lineare.
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Test D — scontri diretti: chi supera il vincente?</h3>
              <p style={styles.caption}>
                Per ogni numero vincente finito tra Rank 4 e 10, confronta le sue sei variabili con il numero immediatamente davanti nella classifica ottimizzata.
                Il Δ è <b>vincente − concorrente</b>: positivo significa che il vincente aveva un valore più alto su quella variabile nonostante fosse stato superato.
                È un test diagnostico, non una prova causale.
              </p>
              <div style={{ overflowX:'auto' }}>
                <table style={ui.table}>
                  <thead><tr><th>Variabile</th><th>Δ medio vs precedente</th><th>Δ medio vs Rank 1</th><th>Vincente più alto</th><th>Vincente più basso</th></tr></thead>
                  <tbody>{analysis.pairwiseTest.featureStats.map(r => (
                    <tr key={r.key}><td><b>{r.label}</b></td><td>{r.meanGap>=0?'+':''}{r.meanGap.toFixed(3)}</td><td>{r.meanTopGap>=0?'+':''}{r.meanTopGap.toFixed(3)}</td><td>{r.winnerHigher}/{analysis.pairwiseTest.comparisons.length} ({r.higherPct})</td><td>{r.winnerLower}/{analysis.pairwiseTest.comparisons.length} ({r.lowerPct})</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, overflowX:'auto' }}>
                <table style={ui.table}>
                  <thead><tr><th>Fascia</th><th>Casi</th><th>Rank medio</th><th>Gap score vincente vs precedente</th></tr></thead>
                  <tbody>{analysis.pairwiseTest.rankBuckets.map(b => <tr key={b.label}><td><b>{b.label}</b></td><td>{b.count}</td><td>{b.avgRank.toFixed(2)}</td><td>{b.meanScoreGap.toFixed(4)}</td></tr>)}</tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, overflowX:'auto' }}>
                <table style={ui.table}>
                  <thead><tr><th>Data</th><th>Pos.</th><th>Vincente</th><th>Rank</th><th>Superato da</th><th>Gap score</th></tr></thead>
                  <tbody>{analysis.pairwiseTest.topCases.map((c,i)=><tr key={`${c.date}-${c.position}-${i}`}><td>{c.date}</td><td>P{c.position+1}</td><td><b>{c.number}</b></td><td>{c.rank}</td><td>{c.prevNumber}</td><td>{(c.winnerScore-c.prevScore).toFixed(4)}</td></tr>)}</tbody>
                </table>
              </div>
              <p style={styles.caption}>
                Il punto chiave da cercare è una variabile con Δ sistematicamente positivo: significherebbe che il vincente possiede più di quella caratteristica del concorrente, ma il punteggio complessivo lo mette comunque dietro.
                In quel caso potremmo ricalibrare la funzione o cercare un'interazione tra variabili invece di aggiungere regole a caso.
              </p>
            </div>




            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>TEST R — ricostruzione della base Rank</h3>
              <p style={styles.caption}>
                Prima di K3 verifichiamo se il problema è la costruzione del Rank. Il nuovo profilo separa il comportamento
                temporale del numero (presenza breve/medio/lungo + ritmo di ritorno) dal comportamento specifico della posizione.
                Tutto è walk-forward: per T si usa solo lo storico fino a T-1. Il test è diagnostico e non modifica il motore.
              </p>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', margin:'12px 0' }}>
                <button onClick={runRAnalysis} disabled={rRunning} style={ui.button}>{rRunning ? 'Test R in corso…' : 'Avvia Test R'}</button>
                <span style={{ color:'#5e7b92', fontSize:12 }}>240 transizioni · 90 numeri · 5 costruzioni del ranking</span>
              </div>
              {!rAnalysisState && <div style={{ ...styles.card, color:'#7893a9', lineHeight:1.55 }}>
                Confronteremo: <b>Rank attuale</b>, <b>Rank temporale</b>, <b>Rank per posizione</b>, <b>Temporale + posizione</b> e
                <b> Rank attuale + piccola correzione posizionale</b>. Se la nuova base migliora davvero, potrà sostituire o correggere
                le regole attuali; se una regola diventa ridondante, il test lo deve evidenziare.
              </div>}
              {rAnalysisState && <>
                <div style={{ overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Modello</th><th>Rank 1</th><th>Top 3</th><th>Top 5</th><th>Top 10</th><th>Rank medio</th></tr></thead>
                    <tbody>{rAnalysisState.modes.map(m => {
                      const x=rAnalysisState.metrics[m.key], b=rAnalysisState.metrics.baseline
                      return <tr key={m.key}><td><b>{m.label}</b></td><td>{pct(x.top1*100,100)}</td><td>{pct(x.top3*100,100)}</td><td>{pct(x.top5*100,100)}</td><td>{pct(x.top10*100,100)}</td><td>{x.avg.toFixed(2)}</td></tr>
                    })}</tbody>
                  </table>
                </div>
                <div style={{ marginTop:12, overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Modello</th><th>Early Top 3</th><th>Middle Top 3</th><th>Recent Top 3</th><th>Stabile?</th></tr></thead>
                    <tbody>{rAnalysisState.modes.map(m=>{
                      const s=rAnalysisState.stability[m.key].map(x=>x.metrics.top3)
                      const spread=(Math.max(...s)-Math.min(...s))*100
                      return <tr key={m.key}><td><b>{m.label}</b></td><td>{(s[0]*100).toFixed(1)}%</td><td>{(s[1]*100).toFixed(1)}%</td><td>{(s[2]*100).toFixed(1)}%</td><td>{spread<=2?'✓ buona':spread<=4?'~ discreta':'✕ debole'}</td></tr>
                    })}</tbody>
                  </table>
                </div>
                <div style={{ marginTop:12, overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Posizione</th>{rAnalysisState.modes.map(m=><th key={m.key}>{m.label}</th>)}</tr></thead>
                    <tbody>{POSITION_LABELS.map((p,i)=><tr key={p}><td><b>{p}</b></td>{rAnalysisState.modes.map(m=><td key={m.key}>{rAnalysisState.current[m.key][i]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <div style={{ ...styles.card, marginTop:10, color:'#91a8ba', lineHeight:1.55 }}>
                  <b style={{color:'#c7d9e8'}}>Regola di lettura:</b> non scegliamo il modello che vince di più sul totale. Deve anche mantenere il vantaggio
                  nei tre blocchi temporali. Un piccolo miglioramento stabile è più interessante di un picco concentrato in un solo periodo.
                </div>
              </>}
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>TEST R2 — quanto deve pesare la correzione di posizione?</h3>
              <p style={styles.caption}>
                R ha indicato che una piccola correzione posizionale può aiutare il Rank attuale. Ora non scegliamo il peso
                guardando un singolo risultato: testiamo sei alpha prefissati e chiediamo che il miglioramento sia presente
                nei tre periodi temporali. La base Rank resta quella attuale; cambia solo la correzione. Tutto è walk-forward.
              </p>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', margin:'12px 0' }}>
                <button onClick={runR2Analysis} disabled={r2Running} style={ui.button}>{r2Running ? 'Test R2 in corso…' : 'Avvia Test R2'}</button>
                <span style={{ color:'#5e7b92', fontSize:12 }}>alpha 0.1 → 0.6 · 240 transizioni · stabilità temporale</span>
              </div>
              {!r2AnalysisState && <div style={{ ...styles.card, color:'#7893a9', lineHeight:1.55 }}>
                Obiettivo: capire se la posizione contiene un'informazione <b>correttiva stabile</b>. Se un alpha migliora Top 3/5/10
                senza perdere il vantaggio nei blocchi early, middle e recent, avremo una candidata seria per il passo successivo.
              </div>}
              {r2AnalysisState && <>
                <div style={{ overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Alpha</th><th>Top 3</th><th>Top 5</th><th>Top 10</th><th>Rank medio</th><th>Δ Top 3 vs base</th><th>Stabilità</th></tr></thead>
                    <tbody>{r2AnalysisState.alphas.map(alpha=>{
                      const x=r2AnalysisState.metrics[alpha], b=r2AnalysisState.base
                      const s=r2AnalysisState.stability[alpha].map(z=>z.top3)
                      const spread=(Math.max(...s)-Math.min(...s))*100
                      return <tr key={alpha}><td><b>{alpha.toFixed(1)}</b></td><td>{(x.top3*100).toFixed(2)}%</td><td>{(x.top5*100).toFixed(2)}%</td><td>{(x.top10*100).toFixed(2)}%</td><td>{x.avg.toFixed(2)}</td><td>{((x.top3-b.top3)*100>=0?'+':'')+((x.top3-b.top3)*100).toFixed(2)} pp</td><td>{spread<=2?'✓ buona':spread<=4?'~ discreta':'✕ debole'}</td></tr>
                    })}</tbody>
                  </table>
                </div>
                <div style={{ marginTop:12, overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Alpha</th><th>Early Top 3</th><th>Middle Top 3</th><th>Recent Top 3</th></tr></thead>
                    <tbody>{r2AnalysisState.alphas.map(alpha=>{const s=r2AnalysisState.stability[alpha]; return <tr key={alpha}><td><b>{alpha.toFixed(1)}</b></td><td>{(s[0].top3*100).toFixed(1)}%</td><td>{(s[1].top3*100).toFixed(1)}%</td><td>{(s[2].top3*100).toFixed(1)}%</td></tr>})}</tbody>
                  </table>
                </div>
                <div style={{ marginTop:12, overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Posizione</th>{r2AnalysisState.alphas.map(a=><th key={a}>α {a.toFixed(1)}</th>)}</tr></thead>
                    <tbody>{POSITION_LABELS.map((p,i)=><tr key={p}><td><b>{p}</b></td>{r2AnalysisState.alphas.map(a=><td key={a}>{r2AnalysisState.current[a][i]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <div style={{ ...styles.card, marginTop:10, color:'#91a8ba', lineHeight:1.55 }}>
                  <b style={{color:'#c7d9e8'}}>Criterio:</b> non prendiamo automaticamente l'alpha con il Top 3 più alto. Cerchiamo il miglior compromesso
                  tra guadagno rispetto al Rank attuale e stabilità temporale. L'alpha migliore viene indicato solo come candidata, non come nuova regola.
                </div>
              </>}
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>TEST R4 — BOOST ADATTIVO DEL RANK</h3>
              <p style={styles.caption}>
                Qui facciamo il passo successivo: non imponiamo più un solo alpha. La correzione posizionale viene calibrata per fascia
                del Rank base, con un boost extra sui candidati già forti. Il test resta walk-forward e confronta sei configurazioni fisse.
              </p>
              <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', margin:'12px 0' }}>
                <button onClick={runR4Analysis} disabled={r4Running} style={ui.button}>{r4Running ? 'Test R4 in corso…' : 'Avvia Test R4 — BOOST'}</button>
                <span style={{ color:'#5e7b92', fontSize:12 }}>240 transizioni · fasce Rank · boost non lineare · regime</span>
              </div>
              {!r4AnalysisState && <div style={{ ...styles.card, color:'#7893a9', lineHeight:1.55 }}>
                Obiettivo: verificare se possiamo ottenere <b>Rank 1 ↑ + Top 3 ↑ + Top 5 ↑</b> mantenendo il <b>Top 10 almeno vicino al baseline</b>.
                Nessuna configurazione viene promossa automaticamente al motore.
              </div>}
              {r4AnalysisState && <>
                <div style={{ overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Config</th><th>Rank medio</th><th>Rank 1</th><th>Top 3</th><th>Top 5</th><th>Top 10</th><th>Stabilità Top3</th></tr></thead>
                    <tbody>{r4AnalysisState.configs.map(c=>{const x=r4AnalysisState.metrics[c.key],s=r4AnalysisState.stability[c.key].map(z=>z.top3),spread=(Math.max(...s)-Math.min(...s))*100;return <tr key={c.key}><td><b>{c.key}</b> · {c.label}</td><td>{x.avg.toFixed(2)}</td><td>{(x.top1*100).toFixed(2)}%</td><td>{(x.top3*100).toFixed(2)}%</td><td>{(x.top5*100).toFixed(2)}%</td><td>{(x.top10*100).toFixed(2)}%</td><td>{spread<=2?'✓ buona':spread<=4?'~ discreta':'✕ debole'}</td></tr>})}</tbody>
                  </table>
                </div>
                <div style={{ marginTop:12, overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Config</th><th>Early Top3</th><th>Middle Top3</th><th>Recent Top3</th></tr></thead>
                    <tbody>{r4AnalysisState.configs.map(c=>{const s=r4AnalysisState.stability[c.key];return <tr key={c.key}><td><b>{c.key}</b></td><td>{(s[0].top3*100).toFixed(1)}%</td><td>{(s[1].top3*100).toFixed(1)}%</td><td>{(s[2].top3*100).toFixed(1)}%</td></tr>})}</tbody>
                  </table>
                </div>
                <div style={{ marginTop:12, overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Posizione</th>{r4AnalysisState.configs.map(c=><th key={c.key}>{c.key}</th>)}</tr></thead>
                    <tbody>{POSITION_LABELS.map((p,i)=><tr key={p}><td><b>{p}</b></td>{r4AnalysisState.configs.map(c=><td key={c.key}>{r4AnalysisState.current[c.key][i]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
                <div style={{ ...styles.card, marginTop:10, color:'#91a8ba', lineHeight:1.55 }}>
                  <b style={{color:'#c7d9e8'}}>Regola di promozione:</b> non basta vincere il Top3. Una configurazione è interessante solo se il vantaggio
                  sopravvive ai tre blocchi temporali e non distrugge il Top10. Il vero obiettivo è trovare un boost selettivo, non semplicemente più aggressivo.
                </div>
              </>}
            </div>

            <div style={{ marginTop: 22 }}>
              <h3 style={ui.h3}>Test E — interazioni: quando due variabili insieme spiegano il Top 3?</h3>
              <p style={styles.caption}>
                Qui non aggiungiamo nuove regole. Per ogni coppia delle sei variabili calcoliamo il prodotto dei valori normalizzati
                (A × B) e confrontiamo la media sui numeri vincenti finiti in Top 3 con quella dei vincenti finiti in Rank 4–10.
                Un Δ positivo indica che la combinazione è mediamente più alta nel Top 3. È un test diagnostico retrospettivo, non causale.
              </p>
              <div style={{ overflowX:'auto' }}>
                <table style={ui.table}>
                  <thead><tr><th>Interazione</th><th>Media Top 3</th><th>Media Rank 4–10</th><th>Δ</th><th>N</th></tr></thead>
                  <tbody>{analysis.interactionTest.pairs.map(r => (
                    <tr key={r.key}><td><b>{r.label}</b></td><td>{r.meanTop3.toFixed(3)}</td><td>{r.meanR4.toFixed(3)}</td><td>{r.delta>=0?'+':''}{r.delta.toFixed(3)}</td><td>{r.top3N} / {r.r4N}</td></tr>
                  ))}</tbody>
                </table>
              </div>
              <div style={{ ...styles.card, marginTop:10, color:'#91a8ba', lineHeight:1.55 }}>
                <b style={{color:'#c7d9e8'}}>Come la leggiamo:</b> se una coppia ha un Δ nettamente superiore alle singole variabili,
                abbiamo un indizio che il modello lineare potrebbe perdere una relazione fra due segnali già presenti. Non significa ancora
                che quella coppia debba essere inserita nel motore: va validata su periodi non usati per il fitting.
              </div>

              <div style={{ marginTop: 14 }}>
                <h3 style={ui.h3}>Test E2 — scontro diretto delle interazioni</h3>
                <p style={styles.caption}>
                  Considera solo i 236 casi (o il numero corrispondente al periodo scelto) in cui il vincente è tra Rank 4 e 10.
                  Per ogni interazione confronta A×B del vincente con A×B del candidato immediatamente sopra.
                  È la versione più vicina alla domanda: “cosa possiede il vincente che il modello non ha premiato abbastanza?”.
                </p>
                <div style={{ overflowX:'auto' }}>
                  <table style={ui.table}>
                    <thead><tr><th>Interazione</th><th>Δ medio</th><th>Vincente più alto</th><th>Vincente più basso</th></tr></thead>
                    <tbody>{analysis.interactionTest.directPairs.map(r => (
                      <tr key={r.key}><td><b>{r.label}</b></td><td>{r.meanGap>=0?'+':''}{r.meanGap.toFixed(3)}</td><td>{r.positive}/{analysis.interactionTest.direct.length} ({r.positivePct})</td><td>{r.negative}/{analysis.interactionTest.direct.length} ({r.negativePct})</td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <p style={styles.caption}>La priorità è cercare un'interazione con Δ positivo e una frequenza di Δ positivo non marginale. Se emerge, la prossima prova sarà una modifica controllata della funzione di scoring, non l'aggiunta indiscriminata di una nuova regola.</p>
              </div>
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
