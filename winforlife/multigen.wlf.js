import { rankedCandidates, compositeScores, NUM_COUNT, POSITIONS } from './scoring.wlf.js';

// Larghezze del pool per posizione (da calibrare con backtest, per ora conservative)
const POOL_WIDTH_BY_POSITION = [5, 6, 7, 7, 7, 7, 7, 7, 6, 5];
const SAMPLES = 20000;
const RESULTS_WANTED = 10;

// Curve di probabilità empiriche fittizie (da sostituire con dati reali dopo backtest)
const RANK_PROBABILITY_CURVES = Array.from({ length: POSITIONS }, () => Array(20).fill(0.05));

function rankProbabilityWeight(position, rank) {
  const bucket = Math.min(Math.floor((rank - 1) / 2), RANK_PROBABILITY_CURVES[position].length - 1);
  return RANK_PROBABILITY_CURVES[position][bucket] || 0.001;
}

// Generatore Park‑Miller deterministico
function makeSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function seedFromDraws(draws) {
  const last = draws[draws.length - 1];
  return draws.length * 100000 + (last ? last.numerone : 0);
}

// Insiemi storici per esclusione duplicati
function buildHistoricalSets(draws) {
  const decine = new Set();
  for (const d of draws) {
    decine.add([...d.numbers].sort((a, b) => a - b).join(','));
  }
  return { decine };
}

function isDuplicate(candidate, sets) {
  const key = [...candidate].sort((a, b) => a - b).join(',');
  return sets.decine.has(key);
}

// Programmazione dinamica per 10 posizioni
function solveDP(perPosition) {
  const dp = [], back = [];
  for (let p = 0; p < POSITIONS; p++) {
    const cands = perPosition[p];
    const dpRow = new Array(cands.length).fill(-Infinity);
    const backRow = new Array(cands.length).fill(-1);
    if (p === 0) {
      for (let k = 0; k < cands.length; k++) dpRow[k] = cands[k][1];
    } else {
      const prevCands = perPosition[p - 1];
      const prevDp = dp[p - 1];
      const prefixMax = new Array(prevCands.length);
      let bestSoFar = -Infinity, bestIdx = -1;
      for (let k = 0; k < prevCands.length; k++) {
        if (prevDp[k] > bestSoFar) { bestSoFar = prevDp[k]; bestIdx = k; }
        prefixMax[k] = bestIdx;
      }
      for (let k = 0; k < cands.length; k++) {
        const [num, weight] = cands[k];
        let lo = 0, hi = prevCands.length - 1, cut = -1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (prevCands[mid][0] < num) { cut = mid; lo = mid + 1; } else hi = mid - 1;
        }
        if (cut >= 0 && prefixMax[cut] >= 0 && prevDp[prefixMax[cut]] > -Infinity) {
          dpRow[k] = weight + prevDp[prefixMax[cut]];
          backRow[k] = prefixMax[cut];
        }
      }
    }
    dp.push(dpRow); back.push(backRow);
  }
  let bestK = -1, bestScore = -Infinity;
  for (let k = 0; k < dp[POSITIONS-1].length; k++) if (dp[POSITIONS-1][k] > bestScore) { bestScore = dp[POSITIONS-1][k]; bestK = k; }
  if (bestK === -1) return null;
  const numeri = new Array(POSITIONS);
  let k = bestK;
  for (let p = POSITIONS - 1; p >= 0; p--) { numeri[p] = perPosition[p][k][0]; k = back[p][k]; }
  return numeri;
}

// Generatore principale
export function generateTopDecine(draws, howMany = RESULTS_WANTED) {
  const fullRanking = [];
  const perPosition = [];
  const infoPerNumero = [];

  for (let p = 0; p < POSITIONS; p++) {
    const full = rankedCandidates(draws, p);
    fullRanking.push(full);
    const info = new Map();
    const pool = full.slice(0, POOL_WIDTH_BY_POSITION[p]).map(([num, score], idx) => {
      const rank = idx + 1;
      info.set(num, { score, rank });
      return [num, rankProbabilityWeight(p, rank)];
    });
    pool.sort((a, b) => a[0] - b[0]);
    perPosition.push(pool);
    infoPerNumero.push(info);
  }

  const historicalSets = buildHistoricalSets(draws);
  const rng = makeSeededRandom(seedFromDraws(draws));
  const found = new Map();
  const ATTEMPTS = howMany * 60;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const perturbed = perPosition.map(cands =>
      cands.map(([num, w]) => [num, w * Math.pow(rng(), 3) * (0.05 + rng() * 4)])
    );
    const numeri = solveDP(perturbed);
    if (!numeri) continue;
    const key = numeri.join(',');
    if (found.has(key)) continue;
    if (isDuplicate(numeri, historicalSets)) continue;

    const dettaglio = numeri.map((num, p) => {
      const { score, rank } = infoPerNumero[p].get(num);
      return { posizione: p + 1, numero: num, punteggio: score, rank, poolSize: fullRanking[p].length };
    });
    const totalScore = dettaglio.reduce((sum, d) => sum + d.punteggio, 0);
    found.set(key, { numeri, punteggioTotale: totalScore, dettaglio });
  }

  // Numerone: generato con le stesse regole (cold_h + delay_h + volatility_h)
  const numeroneScores = new Map();
  const recent = draws.slice(-VOLATILITY_WINDOW).map(d => d.numerone);
  const mean = recent.reduce((s, n) => s + n, 0) / recent.length;
  const variance = recent.reduce((s, n) => s + (n - mean) ** 2, 0) / recent.length;
  const sigma = Math.max(Math.sqrt(variance), 2);
  const cold = coldHScores(draws);
  for (let n = 1; n <= NUM_COUNT; n++) {
    const delay = draws.length - 1 - (draws.map(d => d.numerone).lastIndexOf(n));
    const delayScore = Math.exp(-((delay - 5) ** 2) / (2 * 16));
    const volScore = Math.exp(-((n - mean) ** 2) / (2 * sigma * sigma));
    numeroneScores.set(n, (cold.get(n) || 0) + delayScore + volScore);
  }
  const numeroneSorted = [...numeroneScores.entries()].sort((a, b) => b[1] - a[1]);
  const numerone = numeroneSorted[0][0];

  const results = [...found.values()]
    .sort((a, b) => b.punteggioTotale - a.punteggioTotale)
    .slice(0, howMany)
    .map(s => ({
      ...s,
      rankMedio: s.dettaglio.reduce((sum, d) => sum + d.rank, 0) / s.dettaglio.length
    }));

  return { decine: results, numerone };
}
