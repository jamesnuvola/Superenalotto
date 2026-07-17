// Genera sestine campionando PESATAMENTE da un ventaglio ampio di candidati
// per posizione (non solo i migliori 4) — allargare riflette il vero tasso
// di copertura misurato nel laboratorio di backtest: nei primi 10-20
// candidati il numero vero c'è solo il 20-40% delle volte, quindi
// restringere troppo il ventaglio butta via combinazioni realmente possibili.

import { rankedCandidates } from './scoring'

// Larghezza del ventaglio per posizione, calibrata sul 75° percentile reale
// del rank nel laboratorio di backtest (dove cade il 75% dei casi storici).
// Ricalibrata dopo l'integrazione di VERTVOLATILITY nel punteggio composito.
const POOL_WIDTH_BY_POSITION = [22, 35, 40, 40, 35, 20]
const SAMPLES = 40000       // quante sestine "tentate" per trovare le migliori valide
const RESULTS_WANTED = 10

// Generatore pseudo-casuale deterministico (Park-Miller), seminato dal
// dataset stesso: stesso storico -> stesso seme -> stesse sestine, sempre.
// Cambia solo quando arriva una nuova estrazione reale (cambia il seme).
function makeSeededRandom(seed) {
  let s = seed % 2147483647
  if (s <= 0) s += 2147483646
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function seedFromDraws(draws) {
  const last = draws[draws.length - 1]
  return draws.length * 100000 + (last ? last[1] : 0)
}

function buildHistoricalSets(draws) {
  const sestine = new Set()
  const cinquine = new Set()
  for (const draw of draws) {
    const nums = [...draw[2]].sort((a, b) => a - b)
    sestine.add(nums.join(','))
    for (let skip = 0; skip < 6; skip++) {
      cinquine.add(nums.filter((_, i) => i !== skip).join(','))
    }
  }
  return { sestine, cinquine }
}

function isDuplicate(candidate, historicalSets) {
  const sorted = [...candidate].sort((a, b) => a - b)
  if (historicalSets.sestine.has(sorted.join(','))) return true
  for (let skip = 0; skip < 6; skip++) {
    if (historicalSets.cinquine.has(sorted.filter((_, i) => i !== skip).join(','))) return true
  }
  return false
}

// Pesca un numero a caso da una lista [[numero, punteggio], ...],
// con probabilita' proporzionale al punteggio (non sempre il migliore).
function weightedPick(pool, rng) {
  const total = pool.reduce((s, [, score]) => s + score, 0)
  if (total <= 0) return pool[Math.floor(rng() * pool.length)]
  let r = rng() * total
  for (const entry of pool) {
    r -= entry[1]
    if (r <= 0) return entry
  }
  return pool[pool.length - 1]
}

export function generateTopSestine(draws, howMany = RESULTS_WANTED) {
  const fullRanking = [] // classifica COMPLETA per posizione, per calcolare il rank vero da mostrare
  const perPosition = []
  for (let p = 0; p < 6; p++) {
    const full = rankedCandidates(draws, p)
    fullRanking.push(full)
    perPosition.push(full.slice(0, POOL_WIDTH_BY_POSITION[p]))
  }

  const historicalSets = buildHistoricalSets(draws)
  const rng = makeSeededRandom(seedFromDraws(draws))
  const found = new Map() // chiave = sestina, valore = { numeri, punteggioTotale, dettaglio }

  for (let s = 0; s < SAMPLES; s++) {
    const chosen = []
    const dettaglio = []
    let ok = true
    let totalScore = 0

    for (let p = 0; p < 6; p++) {
      const lastPicked = chosen.length > 0 ? chosen[chosen.length - 1] : 0
      const validPool = perPosition[p].filter(([n]) => n > lastPicked && !chosen.includes(n))
      if (validPool.length === 0) { ok = false; break }
      const [num, score] = weightedPick(validPool, rng)
      chosen.push(num)
      dettaglio.push({
        posizione: p + 1,
        numero: num,
        punteggio: score,
        rank: fullRanking[p].findIndex(([n]) => n === num) + 1,
        poolSize: fullRanking[p].length
      })
      totalScore += score
    }

    if (!ok) continue
    if (isDuplicate(chosen, historicalSets)) continue

    const key = chosen.join(',')
    if (!found.has(key) || found.get(key).punteggioTotale < totalScore) {
      found.set(key, { numeri: chosen, punteggioTotale: totalScore, dettaglio })
    }
  }

  return [...found.values()]
    .sort((a, b) => b.punteggioTotale - a.punteggioTotale)
    .slice(0, howMany)
}

// Statistiche di copertura reale per posizione (dal laboratorio di backtest,
// composito a 5 regole incluso VERTVOLATILITY), da mostrare accanto ai numeri
// generati per calibrare le aspettative.
export const COVERAGE_STATS = [
  { top10: 38.3, top20: 71.6, mediana: 14 }, // P1
  { top10: 22.8, top20: 46.3, mediana: 22 }, // P2
  { top10: 18.2, top20: 39.0, mediana: 26 }, // P3
  { top10: 21.9, top20: 42.2, mediana: 25 }, // P4
  { top10: 22.9, top20: 44.8, mediana: 23 }, // P5
  { top10: 40.1, top20: 75.8, mediana: 13 }  // P6
]
