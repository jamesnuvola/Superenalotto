// Motore di scoring SONAR — porta nel browser la logica validata nel
// laboratorio di backtest (vedi note del progetto).
// Metodo A (somma pesata) confermato come il migliore su tutte le
// posizioni; DECADE, HOT_V, CLUSTER_V, DELAY_V sono le regole valide.

const DELAY_CENTERS = [9, 5, 5, 21, 9, 5] // ottimo trovato per posizione, delay breve ovunque
const DECADE_WINDOW = 20
const HOT_WINDOW = 10
const CLUSTER_MAX_LAG = 5
const DELAY_SIGMA = 6

function decadeOf(n) {
  return Math.floor((n - 1) / 10)
}

function normalize(map) {
  const vals = [...map.values()]
  const max = Math.max(...vals, 1e-9)
  const out = new Map()
  for (const [k, v] of map.entries()) out.set(k, v / max)
  return out
}

export function hotScores(history, position, window = HOT_WINDOW, decadeWindow = DECADE_WINDOW) {
  // Stratificato per decade dominante: conta le apparizioni recenti SOLO nei
  // draw in cui questa posizione era nella stessa decade di adesso, invece
  // di contare alla cieca su tutta la finestra recente. Validato: migliora
  // ogni posizione, in alcuni casi sensibilmente (P1 +42%, P6 +39% standalone).
  const recentForDecade = history.slice(-decadeWindow)
  const decadeFreq = new Map()
  for (const d of recentForDecade) {
    const dec = decadeOf(d[2][position])
    decadeFreq.set(dec, (decadeFreq.get(dec) || 0) + 1)
  }
  const dominantDecade = [...decadeFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]

  const filteredHistory = history.filter(d => decadeOf(d[2][position]) === dominantDecade)
  const recent = filteredHistory.slice(-window)
  const freq = new Map()
  for (const d of recent) {
    const n = d[2][position]
    freq.set(n, (freq.get(n) || 0) + 1)
  }
  return freq
}

export function delayScores(history, position, center = DELAY_CENTERS[position], sigma = DELAY_SIGMA) {
  const lastSeen = new Map()
  history.forEach((d, i) => { lastSeen.set(d[2][position], i) })
  const now = history.length
  const scores = new Map()
  for (const [n, idx] of lastSeen.entries()) {
    const delay = now - idx - 1
    scores.set(n, Math.exp(-((delay - center) ** 2) / (2 * sigma * sigma)))
  }
  return scores
}

export function decadeScores(history, position, window = DECADE_WINDOW) {
  const recent = history.slice(-window)
  const decadeFreq = new Map()
  for (const d of recent) {
    const dec = decadeOf(d[2][position])
    decadeFreq.set(dec, (decadeFreq.get(dec) || 0) + 1)
  }
  const allSeen = new Set(history.map(d => d[2][position]))
  const out = new Map()
  for (const n of allSeen) out.set(n, decadeFreq.get(decadeOf(n)) || 0)
  return out
}

export function clusterScores(history, position, maxLag = CLUSTER_MAX_LAG) {
  const n = history.length
  const scores = new Map()
  for (let lag = 1; lag <= maxLag && lag <= n; lag++) {
    const num = history[n - lag][2][position]
    scores.set(num, (scores.get(num) || 0) + 1 / lag)
  }
  return scores
}

const VOLATILITY_WINDOW = 20
const COLDH_WINDOW = 10

export function volatilityScores(history, position, window = VOLATILITY_WINDOW) {
  const recent = history.slice(-window).map(d => d[2][position])
  const mean = recent.reduce((s, n) => s + n, 0) / recent.length
  const variance = recent.reduce((s, n) => s + (n - mean) ** 2, 0) / recent.length
  const sigma = Math.max(Math.sqrt(variance), 3)
  const allSeen = new Set(history.map(d => d[2][position]))
  const scores = new Map()
  for (const n of allSeen) {
    scores.set(n, Math.exp(-((n - mean) ** 2) / (2 * sigma * sigma)))
  }
  return scores
}

// COLD_H: l'INVERSO di HOT_H (frequenza globale). HOT_H (i numeri piu' usciti
// ovunque di recente) ha lift NEGATIVO (0.55x-0.80x) — invertendolo, i numeri
// MENO usciti ovunque di recente hanno lift positivo e robusto (1.19x-1.59x
// standalone). Validato anche dentro il composito completo: migliora la
// maggior parte delle posizioni.
export function coldHScores(history, position, window = COLDH_WINDOW) {
  const recent = history.slice(-window)
  const freq = new Map()
  for (const d of recent) {
    for (const n of d[2]) freq.set(n, (freq.get(n) || 0) + 1)
  }
  const allSeen = new Set(history.map(d => d[2][position]))
  const scores = new Map()
  for (const n of allSeen) {
    scores.set(n, 1 / (1 + (freq.get(n) || 0)))
  }
  return scores
}

// Punteggio composito (Metodo A validato): somma delle 6 regole normalizzate.
export function compositeScores(history, position) {
  const hot = normalize(hotScores(history, position))
  const delay = normalize(delayScores(history, position))
  const dec = normalize(decadeScores(history, position))
  const clus = normalize(clusterScores(history, position))
  const vol = normalize(volatilityScores(history, position))
  const cold = normalize(coldHScores(history, position))
  const all = new Set([...hot.keys(), ...delay.keys(), ...dec.keys(), ...clus.keys(), ...vol.keys(), ...cold.keys()])
  const scores = new Map()
  for (const n of all) {
    scores.set(n, (hot.get(n) || 0) + (delay.get(n) || 0) + (dec.get(n) || 0) + (clus.get(n) || 0) + (vol.get(n) || 0) + (cold.get(n) || 0))
  }
  return scores
}

// Ordina i candidati per punteggio decrescente: [[numero, score], ...]
export function rankedCandidates(history, position) {
  const scores = compositeScores(history, position)
  return [...scores.entries()].sort((a, b) => b[1] - a[1])
}

// Rank (1-based) del numero realmente uscito in quella posizione, dato lo storico PRECEDENTE.
export function actualRank(history, position, actualNumber) {
  const sorted = rankedCandidates(history, position)
  const idx = sorted.findIndex(([n]) => n === actualNumber)
  return {
    rank: idx >= 0 ? idx + 1 : sorted.length + 1,
    poolSize: sorted.length
  }
}

// Nota storica: una funzione di rifinitura per voti (refineWithVotes,
// basata su DECADE+HOT_V+CLUSTER_V) è stata testata come possibile
// riordino del pool e rimossa dopo aver verificato che peggiora o è
// neutra su tutte le posizioni. Dettagli nel documento di sessione.

export const POSITION_LABELS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
