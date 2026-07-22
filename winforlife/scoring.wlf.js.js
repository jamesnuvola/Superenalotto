// Motore di scoring per Win for Life (10 posizioni, 20 numeri, Numerone)
// Adattamento diretto delle regole validate nel backtest Superenalotto.

export const NUM_COUNT = 20;
export const POSITIONS = 10;

// Parametri calibrati (da raffinare con backtest su storico reale)
const DELAY_CENTERS = [3, 3, 4, 4, 5, 5, 5, 4, 4, 3]; // centri brevi per ogni posizione
const DELAY_SIGMA = 4;
const HOT_WINDOW = 15;          // finestra per HOT_V (più ampia perché ci sono più estrazioni)
const DECADE_WINDOW = 30;       // per HALF (bassi/alti)
const CLUSTER_MAX_LAG = 5;
const VOLATILITY_WINDOW = 20;

// Funzioni di utilità
function normalize(map) {
  const vals = [...map.values()];
  const max = Math.max(...vals, 1e-9);
  const out = new Map();
  for (const [k, v] of map.entries()) out.set(k, v / max);
  return out;
}

// 1. HOT_V (stratificato per "metà dominante")
export function hotScores(history, position, window = HOT_WINDOW, halfWindow = DECADE_WINDOW) {
  const recent = history.slice(-halfWindow);
  const halfFreq = new Map();
  for (const d of recent) {
    const half = d.numbers[position] <= 10 ? 'low' : 'high';
    halfFreq.set(half, (halfFreq.get(half) || 0) + 1);
  }
  const dominantHalf = [...halfFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const filteredHistory = history.filter(d => (d.numbers[position] <= 10 ? 'low' : 'high') === dominantHalf);
  const recentFiltered = filteredHistory.slice(-window);
  const freq = new Map();
  for (const d of recentFiltered) {
    const n = d.numbers[position];
    freq.set(n, (freq.get(n) || 0) + 1);
  }
  return freq;
}

// 2. DELAY_V
export function delayScores(history, position, center = DELAY_CENTERS[position], sigma = DELAY_SIGMA) {
  const lastSeen = new Map();
  history.forEach((d, i) => { lastSeen.set(d.numbers[position], i); });
  const now = history.length;
  const scores = new Map();
  for (let n = 1; n <= NUM_COUNT; n++) {
    const idx = lastSeen.get(n);
    const delay = idx !== undefined ? now - idx - 1 : now;
    scores.set(n, Math.exp(-((delay - center) ** 2) / (2 * sigma * sigma)));
  }
  return scores;
}

// 3. HALF (adattamento di DECADE: premia i numeri nella metà dominante)
export function halfScores(history, position, window = DECADE_WINDOW) {
  const recent = history.slice(-window);
  const halfFreq = new Map();
  for (const d of recent) {
    const half = d.numbers[position] <= 10 ? 'low' : 'high';
    halfFreq.set(half, (halfFreq.get(half) || 0) + 1);
  }
  const dominantHalf = [...halfFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const scores = new Map();
  for (let n = 1; n <= NUM_COUNT; n++) {
    const half = n <= 10 ? 'low' : 'high';
    scores.set(n, half === dominantHalf ? halfFreq.get(dominantHalf) || 0 : 0);
  }
  return scores;
}

// 4. CLUSTER_V
export function clusterScores(history, position, maxLag = CLUSTER_MAX_LAG) {
  const n = history.length;
  const scores = new Map();
  for (let lag = 1; lag <= maxLag && lag <= n; lag++) {
    const num = history[n - lag].numbers[position];
    scores.set(num, (scores.get(num) || 0) + 1 / lag);
  }
  return scores;
}

// 5. VERTVOLATILITY
export function volatilityScores(history, position, window = VOLATILITY_WINDOW) {
  const recent = history.slice(-window).map(d => d.numbers[position]);
  const mean = recent.reduce((s, n) => s + n, 0) / recent.length;
  const variance = recent.reduce((s, n) => s + (n - mean) ** 2, 0) / recent.length;
  const sigma = Math.max(Math.sqrt(variance), 2);
  const scores = new Map();
  for (let n = 1; n <= NUM_COUNT; n++) {
    scores.set(n, Math.exp(-((n - mean) ** 2) / (2 * sigma * sigma)));
  }
  return scores;
}

// 6. COLD_H (e il suo inverso HOT_H, che lasciamo per test)
export function coldHScores(history, window = 10) {
  const recent = history.slice(-window);
  const freq = new Map();
  for (const d of recent) {
    for (const n of d.numbers) freq.set(n, (freq.get(n) || 0) + 1);
  }
  const scores = new Map();
  for (let n = 1; n <= NUM_COUNT; n++) {
    scores.set(n, 1 / (1 + (freq.get(n) || 0)));
  }
  return scores;
}

// Composito (somma semplice, come per Superenalotto)
export function compositeScores(history, position) {
  const hot = normalize(hotScores(history, position));
  const delay = normalize(delayScores(history, position));
  const half = normalize(halfScores(history, position));
  const clus = normalize(clusterScores(history, position));
  const vol = normalize(volatilityScores(history, position));
  const cold = normalize(coldHScores(history));
  const all = new Set([...hot.keys(), ...delay.keys(), ...half.keys(), ...clus.keys(), ...vol.keys(), ...cold.keys()]);
  const scores = new Map();
  for (const n of all) {
    scores.set(n, (hot.get(n) || 0) + (delay.get(n) || 0) + (half.get(n) || 0) + (clus.get(n) || 0) + (vol.get(n) || 0) + (cold.get(n) || 0));
  }
  return scores;
}

// Ranking completo per posizione
export function rankedCandidates(history, position) {
  const scores = compositeScores(history, position);
  return [...scores.entries()].sort((a, b) => b[1] - a[1]);
}

// Rank del numero reale
export function actualRank(history, position, actualNumber) {
  const sorted = rankedCandidates(history, position);
  const idx = sorted.findIndex(([n]) => n === actualNumber);
  return {
    rank: idx >= 0 ? idx + 1 : sorted.length + 1,
    poolSize: sorted.length
  };
}