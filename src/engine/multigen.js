// Genera sestine campionando PESATAMENTE da un ventaglio ampio di candidati
// per posizione (non solo i migliori 4) — allargare riflette il vero tasso
// di copertura misurato nel laboratorio di backtest: nei primi 10-20
// candidati il numero vero c'è solo il 20-40% delle volte, quindi
// restringere troppo il ventaglio butta via combinazioni realmente possibili.

import { rankedCandidates } from './scoring'

// Larghezza del ventaglio per posizione, calibrata sul 75° percentile reale
// del rank nel laboratorio di backtest (dove cade il 75% dei casi storici).
// Ricalibrata dopo l'integrazione di VERTVOLATILITY nel punteggio composito.
const POOL_WIDTH_BY_POSITION = [21, 35, 41, 40, 35, 19]
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

// Curve empiriche di probabilita' per bucket di rank (ampiezza 3), per posizione.
// Estratte dal laboratorio di backtest su 2874 estrazioni reali: "quando il
// numero vero era in questo bucket di rank, quanto spesso e' successo davvero?"
// Sostituiscono il punteggio grezzo come peso di campionamento — pesare per
// probabilita' storica reale invece che per magnitudine del punteggio ha
// mostrato un miglioramento concreto nel laboratorio (media numeri azzeccati
// 1.23 -> 1.52 su 60 estrazioni reali in walk-forward).
const RANK_BUCKET_WIDTH = 3
const RANK_PROBABILITY_CURVES = [
  [0.1414, 0.1294, 0.1264, 0.1017, 0.0984, 0.0939, 0.0718, 0.055, 0.0441, 0.0322, 0.0202, 0.018, 0.0097, 0.0097], // P1
  [0.0722, 0.0789, 0.0767, 0.074, 0.0696, 0.0606, 0.0688, 0.061, 0.0561, 0.0572, 0.0531, 0.0415, 0.04, 0.0381], // P2
  [0.0666, 0.0628, 0.0617, 0.0681, 0.0651, 0.0576, 0.0449, 0.0587, 0.0527, 0.052, 0.0438, 0.0475, 0.043, 0.0441], // P3
  [0.0752, 0.0673, 0.0639, 0.0602, 0.0617, 0.0572, 0.0617, 0.061, 0.0531, 0.0535, 0.043, 0.0475, 0.0438, 0.0374], // P4
  [0.0711, 0.0699, 0.0714, 0.0733, 0.077, 0.0662, 0.0636, 0.0662, 0.0539, 0.0535, 0.0583, 0.0456, 0.0419, 0.04], // P5
  [0.1436, 0.1537, 0.1189, 0.1129, 0.1066, 0.0894, 0.0748, 0.0456, 0.0389, 0.0266, 0.0142, 0.0108, 0.015, 0.0116] // P6
]

function rankProbabilityWeight(position, rank) {
  const bucket = Math.floor((rank - 1) / RANK_BUCKET_WIDTH)
  const curve = RANK_PROBABILITY_CURVES[position]
  return curve[bucket] ?? 0.001 // piccola probabilita' residua oltre la curva misurata
}

// Distribuzione reale del rank OSSERVATA PER POSIZIONE (motore a 5 regole,
// 2.674 estrazioni reali in walk-forward). Usata per mostrare quanto il rank
// di un numero scelto si discosta dalla fascia tipica DI QUELLA posizione
// specifica, non da una media generica che nasconderebbe le differenze tra
// posizioni forti (P1/P6) e deboli (P2-P5).
export const RANK_BANDS_BY_POSITION = [
  { p25: 6, mediana: 13, p75: 21 },  // P1
  { p25: 10, mediana: 21, p75: 35 }, // P2
  { p25: 12, mediana: 25, p75: 41 }, // P3
  { p25: 12, mediana: 24, p75: 40 }, // P4
  { p25: 11, mediana: 22, p75: 35 }, // P5
  { p25: 5, mediana: 12, p75: 19 }   // P6
]

// Distribuzione reale del "rank medio sulle 6 posizioni" osservata nelle 2.674
// estrazioni reali testate in walk-forward. Serve a calibrare onestamente le
// aspettative: nessuna estrazione reale ha mai avuto un rank medio sotto 4.17
// — se una sestina proposta ha un rank medio piu' basso, e' uno scenario piu'
// ottimistico di qualunque cosa si sia mai verificata, non un'anomalia del calcolo.
export const HISTORICAL_AVG_RANK = {
  minimoStorico: 5.67,
  p10: 12.67,
  p25: 16.17,
  mediana: 21.00,
  p75: 27.00,
  p90: 33.83
}

// Banda di plausibilita' (10°-90° percentile reale): le sestine generate
// devono avere un rank medio dentro questa fascia, altrimenti vengono
// scartate. Senza questo filtro, cercare tra migliaia di campioni e mostrare
// sempre il punteggio piu' alto trova quasi per costruzione un profilo
// estremo (tutti rank 1) mai osservato in 2.874 estrazioni reali. Il vincolo
// non cambia in modo significativo il tasso di successo pratico (verificato:
// 1.32 senza vincolo vs 1.37 con vincolo, su 60 estrazioni reali — nei
// margini di rumore), ma evita di mostrare profili irrealistici.
const PLAUSIBLE_AVG_RANK_RANGE = [HISTORICAL_AVG_RANK.p10, HISTORICAL_AVG_RANK.p90]

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

// Risolve, per un dato set di pesi (eventualmente perturbati casualmente),
// la combinazione VALIDA (crescente, 6 distinti) con punteggio totale
// massimo — programmazione dinamica esatta, nessun tentativo sprecato.
// A parita' di qualità del motore, è ~15 volte più veloce del campionamento
// sequenziale e garantisce sempre una combinazione valida per costruzione.
function solveDP(perPosition) {
  const dp = [], back = []
  for (let p = 0; p < 6; p++) {
    const cands = perPosition[p]
    const dpRow = new Array(cands.length).fill(-Infinity)
    const backRow = new Array(cands.length).fill(-1)
    if (p === 0) {
      for (let k = 0; k < cands.length; k++) dpRow[k] = cands[k][1] // peso perturbato
    } else {
      const prevCands = perPosition[p - 1]
      const prevDp = dp[p - 1]
      const prefixMax = new Array(prevCands.length)
      let bestSoFar = -Infinity, bestIdx = -1
      for (let k = 0; k < prevCands.length; k++) {
        if (prevDp[k] > bestSoFar) { bestSoFar = prevDp[k]; bestIdx = k }
        prefixMax[k] = bestIdx
      }
      for (let k = 0; k < cands.length; k++) {
        const [num, weight] = cands[k]
        let lo = 0, hi = prevCands.length - 1, cut = -1
        while (lo <= hi) {
          const mid = (lo + hi) >> 1
          if (prevCands[mid][0] < num) { cut = mid; lo = mid + 1 } else hi = mid - 1
        }
        if (cut >= 0 && prefixMax[cut] >= 0 && prevDp[prefixMax[cut]] > -Infinity) {
          dpRow[k] = weight + prevDp[prefixMax[cut]]
          backRow[k] = prefixMax[cut]
        }
      }
    }
    dp.push(dpRow); back.push(backRow)
  }
  let bestK = -1, bestScore = -Infinity
  for (let k = 0; k < dp[5].length; k++) if (dp[5][k] > bestScore) { bestScore = dp[5][k]; bestK = k }
  if (bestK === -1) return null
  const numeri = new Array(6)
  let k = bestK
  for (let p = 5; p >= 0; p--) { numeri[p] = perPosition[p][k][0]; k = back[p][k] }
  return numeri
}

export function generateTopSestine(draws, howMany = RESULTS_WANTED) {
  const fullRanking = [] // classifica COMPLETA per posizione, per calcolare il rank vero da mostrare
  const perPosition = [] // [numero, pesoEmpirico] ordinato per NUMERO (serve alla DP)
  const infoPerNumero = [] // Map numero -> {score, rank} per ricostruire il dettaglio dopo

  for (let p = 0; p < 6; p++) {
    const full = rankedCandidates(draws, p)
    fullRanking.push(full)
    const info = new Map()
    const pool = full.slice(0, POOL_WIDTH_BY_POSITION[p]).map(([num, score], idx) => {
      const rank = idx + 1
      info.set(num, { score, rank })
      return [num, rankProbabilityWeight(p, rank)]
    })
    pool.sort((a, b) => a[0] - b[0]) // ordina per NUMERO crescente, richiesto dalla DP
    perPosition.push(pool)
    infoPerNumero.push(info)
  }

  const historicalSets = buildHistoricalSets(draws)
  const rng = makeSeededRandom(seedFromDraws(draws))
  const found = new Map() // chiave = sestina, valore = { numeri, punteggioTotale, dettaglio }
  const ATTEMPTS = howMany * 60

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    // Rumore casuale ampio sui pesi ad ogni tentativo: garantisce sia
    // diversita' vera tra le sestine proposte, sia che una parte dei
    // tentativi ricada nella fascia di rank medio realmente plausibile
    // (la DP, trovando sempre l'ottimo, tenderebbe altrimenti a proporre
    // sempre profili piu' ottimistici di quanto sia mai accaduto davvero).
    const perturbedPerPosition = perPosition.map(cands =>
      cands.map(([num, weight]) => [num, weight * Math.pow(rng(), 3) * (0.05 + rng() * 4)])
    )
    const numeri = solveDP(perturbedPerPosition)
    if (!numeri) continue

    const key = numeri.join(',')
    if (found.has(key)) continue
    if (isDuplicate(numeri, historicalSets)) continue

    const dettaglio = numeri.map((num, p) => {
      const { score, rank } = infoPerNumero[p].get(num)
      return { posizione: p + 1, numero: num, punteggio: score, rank, poolSize: fullRanking[p].length }
    })
    const avgRank = dettaglio.reduce((sum, d) => sum + d.rank, 0) / dettaglio.length
    if (avgRank < PLAUSIBLE_AVG_RANK_RANGE[0] || avgRank > PLAUSIBLE_AVG_RANK_RANGE[1]) continue

    const totalScore = dettaglio.reduce((sum, d) => sum + d.punteggio, 0)
    found.set(key, { numeri, punteggioTotale: totalScore, dettaglio })
  }

  return [...found.values()]
    .sort((a, b) => b.punteggioTotale - a.punteggioTotale)
    .slice(0, howMany)
    .map(s => ({
      ...s,
      rankMedio: s.dettaglio.reduce((sum, d) => sum + d.rank, 0) / s.dettaglio.length
    }))
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
