import { useState, useMemo } from 'react'
import { v, styles, MONO, P, ballStyle } from '../utils/constants'
import { hotScores, delayScores, decadeScores, clusterScores, volatilityScores, coldHScores, POSITION_LABELS } from '../engine/scoring'
import { statoRegolaPerPosizione, fattorePeso } from '../engine/dominant-band'
import { RANK_BANDS_BY_POSITION } from '../engine/multigen'
import PosizioniChart, { historicalSeries, stimaProssimaData } from './PosizioniChart'
import { buildProjection } from './proiezione'

// ---------- motore di backtest (walk-forward, per posizione) ----------
function nCk(n, k) { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r }
const ordScore = (p, val) => nCk(val - 1, p) * nCk(90 - val, 5 - p)
function normMax(map) { let mx = 1e-9; for (const val of map.values()) if (val > mx) mx = val; const o = new Map(); for (const [k, val] of map) o.set(k, val / mx); return o }
// fattori "scarto/sussurro" — spenti di default, non toccano il composito finché non li accendi.
const freqUltime = (n) => (h) => { const c = new Map(); for (const d of h.slice(-n)) for (const num of d[2]) c.set(num, (c.get(num) || 0) + 1); const m = new Map(); for (let v = 1; v <= 90; v++) m.set(v, c.get(v) || 0); return m }
const hotH = (h) => freqUltime(10)(h)          // caldi ultime 10 (bocciato, lift 0.55-0.80x)
const ripetuti = (h) => freqUltime(60)(h)      // "si ripete da mesi" (+2.6%, dentro il rumore)
// AFFINITA: frequenza storica INTERA del numero in QUELLA posizione — segnale isolato più forte del doc (z=5.75), bocciato end-to-end (t=-4.612, in gran parte DECADE amplificato)
const affinita = (h, p) => { const c = new Map(); for (const d of h) c.set(d[2][p], (c.get(d[2][p]) || 0) + 1); const m = new Map(); for (let v = 1; v <= 90; v++) m.set(v, c.get(v) || 0); return m }
// MEAN-REV: premia i numeri LONTANI dalla media recente (inverso di VERTVOL) — bocciato netto nel doc
const meanRev = (h, p) => { const rec = h.slice(-20).map(d => d[2][p]); const mean = rec.reduce((a, b) => a + b, 0) / (rec.length || 1); const m = new Map(); for (let v = 1; v <= 90; v++) m.set(v, Math.abs(v - mean)); return m }
const RULE_FN = { decade: decadeScores, hot: hotScores, cluster: clusterScores, vol: volatilityScores, delay: delayScores, cold: coldHScores, hotH: hotH, ripetuti: ripetuti, affinita: affinita, meanRev: meanRev }
const RULE_LABEL = { decade: 'DECADE', hot: 'HOT_V', cluster: 'CLUSTER', vol: 'VERTVOL', delay: 'DELAY_V', cold: 'COLD_H', hotH: 'HOT_H', ripetuti: 'RIPETUTI', affinita: 'AFFINITÀ', meanRev: 'MEAN-REV' }
const CORE_KEYS = ['decade', 'hot', 'cluster', 'vol', 'delay', 'cold']
const SCARTI_KEYS = ['hotH', 'ripetuti', 'affinita', 'meanRev']
const ALL_RULES = { decade: 1, hot: 1, cluster: 1, vol: 1, delay: 1, cold: 1 }

function customComposite(h, p, rules) {
  const active = Object.keys(RULE_FN).filter(k => (rules[k] || 0) > 0)
  if (active.length === 0) return new Map()
  const maps = active.map(k => ({ w: rules[k], m: normMax(RULE_FN[k](h, p)) }))
  const all = new Set(); maps.forEach(x => { for (const k of x.m.keys()) all.add(k) })
  const out = new Map()
  for (const n of all) { let s = 0; for (const x of maps) s += (x.m.get(n) || 0) * x.w; out.set(n, s) }
  return out
}

// classifica (num, rank) per una posizione dato un settaggio
function rankingPos(h, p, set, bandaStato, regModel) {
  let base
  if (set.base === 'regressione' && regModel) {
    base = scoreReg(h, p, regModel)
  } else if (set.base === 'ordstat') {
    base = new Map(); for (let val = 1; val <= 90; val++) base.set(val, ordScore(p, val))
  } else if (set.base === 'miscela') {
    const comp = customComposite(h, p, set.rules)
    const cn = normMax(comp); let omx = 1e-9; for (let val = 1; val <= 90; val++) omx = Math.max(omx, ordScore(p, val))
    base = new Map(); for (let val = 1; val <= 90; val++) base.set(val, (1 - set.alpha) * (cn.get(val) || 0) + set.alpha * (ordScore(p, val) / omx))
  } else {
    base = customComposite(h, p, set.rules) // composito (o regressione senza modello ancora pronto)
  }
  if (set.banda && bandaStato) {
    const ranked = [...base.entries()].sort((a, b) => b[1] - a[1])
    const w = new Map(); ranked.forEach(([num], i) => w.set(num, base.get(num) * fattorePeso(bandaStato[p], i + 1)))
    base = w
  }
  let ranked = [...base.entries()].sort((a, b) => b[1] - a[1]).map(([num], i) => ({ num, rank: i + 1 }))
  if (set.numMin > 1 || set.numMax < 90) ranked = ranked.filter(r => r.num >= set.numMin && r.num <= set.numMax)
  if (set.rankMin > 1 || set.rankMax < 90) ranked = ranked.filter(r => r.rank >= set.rankMin && r.rank <= set.rankMax)
  return ranked
}

// ---- regressione logistica per posizione (opzione di confronto; nel doc bocciata end-to-end) ----
// feature = le 6 regole core normalizzate. Modello allenato walk-forward sulla storia
// PRIMA del periodo valutato (taratura ed esame restano fuori campione). È la modalità lenta.
const REG_FEAT = ['decade', 'hot', 'cluster', 'vol', 'delay', 'cold']
function featMaps(h, p) { return REG_FEAT.map(k => normMax(RULE_FN[k](h, p))) }
function scoreReg(h, p, model) {
  const maps = featMaps(h, p)
  const out = new Map()
  for (let v = 1; v <= 90; v++) {
    let z = model.b; for (let k = 0; k < maps.length; k++) z += model.w[k] * (maps[k].get(v) || 0)
    out.set(v, 1 / (1 + Math.exp(-z)))
  }
  return out
}
function trainReg(draws, p, upToIdx) {
  const WIN = 250, NEG = 10, EPOCHS = 100, LR = 0.3, L2 = 0.4
  const start = Math.max(400, upToIdx - WIN)
  const X = [], Y = []
  for (let t = start; t < upToIdx; t++) {
    const maps = featMaps(draws.slice(0, t), p)
    const feat = num => maps.map(m => m.get(num) || 0)
    const win = draws[t][2][p]
    X.push(feat(win)); Y.push(1)
    for (let j = 0; j < NEG; j++) { const num = 1 + Math.floor(Math.random() * 90); if (num !== win) { X.push(feat(num)); Y.push(0) } }
  }
  const d = REG_FEAT.length, w = new Array(d).fill(0); let b = 0
  const nn = X.length || 1
  for (let e = 0; e < EPOCHS; e++) {
    const gw = new Array(d).fill(0); let gb = 0
    for (let i = 0; i < X.length; i++) {
      let z = b; for (let k = 0; k < d; k++) z += w[k] * X[i][k]
      const err = 1 / (1 + Math.exp(-z)) - Y[i]
      for (let k = 0; k < d; k++) gw[k] += err * X[i][k]
      gb += err
    }
    for (let k = 0; k < d; k++) w[k] -= LR * (gw[k] / nn + L2 * w[k])
    b -= LR * (gb / nn)
  }
  return { w, b }
}
function startIdxOf(draws, fromYM) { for (let t = 1; t < draws.length; t++) if (ymOf(draws[t]) >= fromYM) return t; return draws.length }
function trainModels(draws, sets, upToIdx) { return sets.map((s, p) => s.base === 'regressione' ? trainReg(draws, p, upToIdx) : null) }

const ymOf = d => { const [g, m, a] = d[0].split('/').map(Number); return a * 100 + m }
const needBanda = sets => sets.some(s => s && s.banda)

// backtest: per ogni posizione usa il suo settaggio; ritorna hit@3 e hit@1 per posizione
function backtestMix(draws, sets, fromYM, toYM) {
  const hit1 = [0, 0, 0, 0, 0, 0], hit3 = [0, 0, 0, 0, 0, 0]; let n = 0
  const usaBanda = needBanda(sets)
  const regModels = trainModels(draws, sets, startIdxOf(draws, fromYM))
  for (let t = 1; t < draws.length; t++) {
    const y = ymOf(draws[t]); if (y < fromYM || y > toYM) continue
    const h = draws.slice(0, t)
    const banda = usaBanda ? statoRegolaPerPosizione(h) : null
    const real = draws[t][2]
    for (let p = 0; p < 6; p++) {
      const ranked = rankingPos(h, p, sets[p], banda, regModels[p])
      const t3 = ranked.slice(0, 3).map(r => r.num)
      if (t3[0] === real[p]) hit1[p]++
      if (t3.includes(real[p])) hit3[p]++
    }
    n++
  }
  return { hit1, hit3, n }
}
const somma = a => a.reduce((x, y) => x + y, 0)

// sestina del mix (una per estrazione) e conteggio premi reali (per insieme, col jolly)
function sestinaMix(h, sets, banda, regModels) {
  const s = []; let prev = 0
  for (let p = 0; p < 6; p++) {
    const ranked = rankingPos(h, p, sets[p], banda, regModels ? regModels[p] : null)
    for (const r of ranked) { if (r.num > prev && !s.includes(r.num)) { s.push(r.num); prev = r.num; break } }
  }
  return s.length === 6 ? s : null
}
function premiMix(draws, sets, fromYM, toYM) {
  const t = { '2': 0, '3': 0, '4': 0, '5': 0, '5+J': 0, '6': 0 }
  const usaBanda = needBanda(sets)
  const regModels = trainModels(draws, sets, startIdxOf(draws, fromYM))
  for (let i = 1; i < draws.length; i++) {
    const y = ymOf(draws[i]); if (y < fromYM || y > toYM) continue
    const h = draws.slice(0, i)
    const banda = usaBanda ? statoRegolaPerPosizione(h) : null
    const g = sestinaMix(h, sets, banda, regModels); if (!g) continue
    const set = new Set(draws[i][2]); let m = 0; g.forEach(n => { if (set.has(n)) m++ })
    if (m === 5) { const np = g.filter(n => !set.has(n)); if (np.length && np[0] === draws[i][3]) { t['5+J']++; continue } }
    if (m >= 2) t[String(m)]++
  }
  return t
}

// genera N sestine col mix, coi rank REALISTICI per posizione (come la SERIA), non tutti a rank 1
function generaMix(draws, sets, quante) {
  const banda = needBanda(sets) ? statoRegolaPerPosizione(draws) : null
  const regModels = trainModels(draws, sets, draws.length)
  const perPos = [0, 1, 2, 3, 4, 5].map(p => rankingPos(draws, p, sets[p], banda, regModels[p]))
  const poolSize = perPos.map(rk => rk.length)
  const rankOf = perPos.map(rk => { const m = new Map(); rk.forEach(r => m.set(r.num, r.rank)); return m })
  const target = [0, 1, 2, 3, 4, 5].map(p => RANK_BANDS_BY_POSITION[p].mediana)
  const sestine = []; const seen = new Set()
  for (let a = 0; a < quante * 60 && sestine.length < quante; a++) {
    const s = []; let prev = 0; let ok = true
    for (let p = 0; p < 6; p++) {
      const cands = perPos[p].filter(r => r.num > prev && !s.includes(r.num))
      if (!cands.length) { ok = false; break }
      const tg = Math.max(1, target[p] + (Math.random() - 0.5) * target[p]) // rank tipico + variabilità
      let best = cands[0], bd = Infinity
      for (const r of cands) { const d = Math.abs(r.rank - tg); if (d < bd) { bd = d; best = r } }
      s.push(best.num); prev = best.num
    }
    if (ok && s.length === 6) { const key = s.join(','); if (!seen.has(key)) { seen.add(key); sestine.push(s) } }
  }
  return sestine.map(nums => ({
    nums,
    dett: nums.map((num, p) => ({ num, rank: rankOf[p].get(num), pool: poolSize[p] })),
    rankMedio: nums.reduce((acc, num, p) => acc + (rankOf[p].get(num) || 0), 0) / 6
  }))
}

// ---- pattern dei delta tra posizioni adiacenti ----
// delta(t) = [P2-P1, P3-P2, P4-P3, P5-P4, P6-P5] per l'estrazione t. Chiede: il delta di
// un'estrazione si ripresenta (stesso, o in proporzione) più avanti — SEMPRE nell'ordine
// reale in cui sono accadute, nessuna estrazione spostata dal suo posto. Il confronto è
// tra distanze: se il pattern è vero, dovrebbe essere più forte alla distanza 1 (la
// prossima estrazione) che a distanze maggiori; se è uguale a ogni distanza, è solo la
// forma dei numeri, non una relazione temporale. Taratura ed esame separati.
const PAIR_LABELS = ['P1→P2', 'P2→P3', 'P3→P4', 'P4→P5', 'P5→P6']
const LAGS = [1, 2, 3, 5]
const deltasOf = ds => ds.map(d => { const n = d[2]; return [n[1] - n[0], n[2] - n[1], n[3] - n[2], n[4] - n[3], n[5] - n[4]] })
const periodDraws = (draws, from, to) => draws.filter(d => { const y = ymOf(d); return y >= from && y <= to })
const matchExact = (a, b, tol) => Math.abs(a - b) <= tol
const matchProp = (a, b, band) => { if (a === 0 && b === 0) return true; if (a === 0 || b === 0) return Math.abs(a - b) <= 2; if (Math.sign(a) !== Math.sign(b)) return false; const r = b / a; return r >= band[0] && r <= band[1] }
function lagRate(deltas, fn, idx, lag) { let hit = 0, tot = 0; for (let i = 0; i + lag < deltas.length; i++) { tot++; if (fn(deltas[i][idx], deltas[i + lag][idx])) hit++ } return tot ? hit / tot : null }
function topPatterns(deltas, idx, k = 3) {
  const c = new Map()
  for (let i = 0; i < deltas.length - 1; i++) if (matchExact(deltas[i][idx], deltas[i + 1][idx], 0)) { const val = deltas[i][idx]; c.set(val, (c.get(val) || 0) + 1) }
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, k)
}
function esameRipeteValore(deltas, idx, val) { let n = 0; for (let i = 0; i < deltas.length - 1; i++) if (deltas[i][idx] === val && deltas[i + 1][idx] === val) n++; return n }

function median(arr) { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

// ---- analogia con lo storico: la finestra delle ultime W estrazioni si è già vista? ----
// Cerca ovunque nello storico (ordine reale, mai mescolato) finestre di W estrazioni
// con lo stesso pattern di delta (uguale o in proporzione), e classifica cosa è successo
// DOPO ciascuna: simile all'ultimo delta della finestra, opposto (segno invertito), o
// diverso. Tre esiti: quasi sempre diverso → forma diversa dai match; spesso simile →
// segui quella distribuzione; metà e metà → se la finestra recente alterna, previsione
// opposta all'ultimo; se segue un trend, previsione di continuazione. Calcola anche un
// bersaglio DELTA numerico per posizione, usato poi per generare una sestina (i delta
// osservati sono sempre positivi — i 6 numeri sono ordinati — quindi "opposto" in pratica
// non scatta mai: i casi vivi sono simile/diverso/trend).
function trovaAnalogia(draws, W, tolExact, propPct) {
  const band = [Math.max(0.01, 1 - propPct / 100), 1 + propPct / 100]
  const allD = deltasOf(draws), N = allD.length
  if (N < 2 * W + 1) return null
  const rows = PAIR_LABELS.map((label, idx) => {
    const cur = allD.slice(N - W, N).map(d => d[idx])
    const matches = []
    for (let i = 0; i + W <= N - W; i++) {
      const cand = []; for (let k = 0; k < W; k++) cand.push(allD[i + k][idx])
      let ok = true; for (let k = 0; k < W; k++) { if (!(matchExact(cand[k], cur[k], tolExact) || matchProp(cand[k], cur[k], band))) { ok = false; break } }
      if (!ok) continue
      const nextDelta = allD[i + W][idx], lastDelta = cand[W - 1]
      let cls
      if (matchExact(nextDelta, lastDelta, tolExact) || matchProp(nextDelta, lastDelta, band)) cls = 'simile'
      else if (Math.sign(nextDelta) !== 0 && Math.sign(lastDelta) !== 0 && Math.sign(nextDelta) === -Math.sign(lastDelta)) cls = 'opposto'
      else cls = 'diverso'
      matches.push({ data: draws[i + W][0], nextDelta, cls })
    }
    const n = matches.length
    const p = c => n ? matches.filter(m => m.cls === c).length / n : 0
    const simile = p('simile'), opposto = p('opposto'), diverso = p('diverso')
    let alternanza = true; for (let k = 1; k < W; k++) if (!(Math.sign(cur[k]) !== 0 && Math.sign(cur[k - 1]) !== 0 && Math.sign(cur[k]) === -Math.sign(cur[k - 1]))) { alternanza = false; break }
    let trendUp = true, trendDown = true; for (let k = 1; k < W; k++) { if (!(cur[k] > cur[k - 1])) trendUp = false; if (!(cur[k] < cur[k - 1])) trendDown = false }
    const trend = trendUp ? 'su' : trendDown ? 'giù' : null
    const last = cur[W - 1]
    let verdetto, target = null
    if (n < 5) verdetto = `campione troppo piccolo (${n} casi) per dire qualcosa`
    else if (diverso > 0.5 && diverso > simile + 0.15) { verdetto = 'quasi sempre diverso → aspettati una forma diversa dai casi trovati'; target = median(matches.filter(m => m.cls === 'diverso').map(m => m.nextDelta)) }
    else if (simile > 0.5 && simile > diverso + 0.15) { verdetto = 'spesso simile → segui la distribuzione dei casi trovati'; target = last }
    else if (alternanza) { verdetto = 'la finestra recente alterna → previsione: il segno opposto all\'ultimo delta'; target = Math.max(1, cur[0]) }
    else if (trend) { verdetto = `la finestra recente segue un trend verso ${trend === 'su' ? "l'alto" : 'il basso'} → previsione: continua nella stessa direzione`; target = Math.max(1, Math.min(89, last + (last - cur[W - 2]))) }
    else verdetto = 'metà e metà, senza alternanza né trend chiaro nella finestra recente — nessuna indicazione'
    return { label, n, simile, opposto, diverso, alternanza, trend, cur, verdetto, target, esempi: matches.slice(-5), serie: allD.slice(Math.max(0, N - 30), N).map(d => d[idx]) }
  })
  return rows
}

// grafico unico: le 5 onde (una per coppia di posizioni) sovrapposte, stesso asse —
// così si vede se si muovono insieme o no. Linea verticale = dove inizia la finestra attuale.
function MultiWave({ series, evid, width = 340, height = 120 }) {
  if (!series.length || !series[0].values.length) return null
  const allVals = series.flatMap(s => s.values)
  const min = Math.min(...allVals), max = Math.max(...allVals), range = (max - min) || 1
  const n = series[0].values.length
  const xStep = width / Math.max(1, n - 1)
  const y = val => height - 8 - ((val - min) / range) * (height - 16)
  const splitX = (n - evid) * xStep
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <line x1={splitX} y1={0} x2={splitX} y2={height} stroke={v.border} strokeWidth="1" strokeDasharray="3,3" />
      {series.map((s, si) => (
        <polyline key={si} points={s.values.map((val, i) => `${(i * xStep).toFixed(1)},${y(val).toFixed(1)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.6" opacity={0.95} />
      ))}
    </svg>
  )
}

// genera sestine guidate dai bersagli-delta dell'analogia: per ogni posizione, tra i
// candidati del ranking normale di quella posizione (le regole/pesi configurati), sceglie
// quello più vicino al delta bersaglio rispetto al precedente. Dove non c'è un bersaglio
// (verdetto senza indicazione), lascia decidere il ranking normale, senza forzare nulla.
function generaConIntuito(draws, sets, analogiaRows, quante) {
  if (!analogiaRows) return []
  const banda = needBanda(sets) ? statoRegolaPerPosizione(draws) : null
  const regModels = trainModels(draws, sets, draws.length)
  const perPos = [0, 1, 2, 3, 4, 5].map(p => rankingPos(draws, p, sets[p], banda, regModels[p]))
  const poolSize = perPos.map(rk => rk.length)
  const rankOf = perPos.map(rk => { const m = new Map(); rk.forEach(r => m.set(r.num, r.rank)); return m })
  const targets = analogiaRows.map(r => r.target)
  const sestine = []; const seen = new Set()
  for (let a = 0; a < quante * 60 && sestine.length < quante; a++) {
    const s = []; let prev = 0; let ok = true
    for (let p = 0; p < 6; p++) {
      const cands = perPos[p].filter(r => r.num > prev && !s.includes(r.num))
      if (!cands.length) { ok = false; break }
      let chosen
      const t = p === 0 ? null : targets[p - 1]
      if (t === null) { const idx = a === 0 ? 0 : Math.min(cands.length - 1, Math.floor(Math.random() * Math.random() * 4)); chosen = cands[idx] }
      else {
        const withDist = cands.map(r => ({ r, d: Math.abs((r.num - prev) - t) })).sort((x, y) => x.d - y.d)
        const idx = a === 0 ? 0 : Math.min(withDist.length - 1, Math.floor(Math.random() * 3))
        chosen = withDist[idx].r
      }
      s.push(chosen.num); prev = chosen.num
    }
    if (ok && s.length === 6) { const key = s.join(','); if (!seen.has(key)) { seen.add(key); sestine.push(s) } }
  }
  return sestine.map(nums => ({
    nums,
    dett: nums.map((num, p) => ({ num, rank: rankOf[p].get(num), pool: poolSize[p] })),
    rankMedio: nums.reduce((acc, num, p) => acc + (rankOf[p].get(num) || 0), 0) / 6
  }))
}

function analizzaPattern(draws, tf, tt, ef, et, tolExact, propPct) {
  const band = [Math.max(0.01, 1 - propPct / 100), 1 + propPct / 100]
  const trainD = deltasOf(periodDraws(draws, tf, tt)), examD = deltasOf(periodDraws(draws, ef, et))
  const rows = PAIR_LABELS.map((label, idx) => {
    const exact = LAGS.map(lag => ({ lag, train: lagRate(trainD, (a, b) => matchExact(a, b, tolExact), idx, lag), exam: lagRate(examD, (a, b) => matchExact(a, b, tolExact), idx, lag) }))
    const prop = LAGS.map(lag => ({ lag, train: lagRate(trainD, (a, b) => matchProp(a, b, band), idx, lag), exam: lagRate(examD, (a, b) => matchProp(a, b, band), idx, lag) }))
    const top = topPatterns(trainD, idx, 3).map(([val, n]) => ({ val, nTrain: n, nExam: esameRipeteValore(examD, idx, val) }))
    return { label, exact, prop, top }
  })
  return { rows, nTrain: trainD.length, nExam: examD.length }
}

// ricerca ONESTA per una posizione: prova una griglia, sceglie il meglio in TARATURA,
// riporta il risultato all'ESAME. Non sceglie sull'esame (sarebbe overfitting).
// ricerca ONESTA per una posizione: ottimizza i PESI delle regole (coordinate ascent)
// più base/banda, sceglie sul TARATURA e riporta il risultato all'ESAME.
function cercaPosizione(draws, baseSet, p, tf, tt, ef, et) {
  const KEYS = [...CORE_KEYS, ...SCARTI_KEYS]
  const buildCache = (from, to) => {
    const rows = []
    for (let t = 1; t < draws.length; t++) {
      const y = ymOf(draws[t]); if (y < from || y > to) continue
      const h = draws.slice(0, t)
      const rm = {}; for (const k of KEYS) rm[k] = normMax(RULE_FN[k](h, p))
      let omx = 1e-9; for (let v = 1; v <= 90; v++) omx = Math.max(omx, ordScore(p, v))
      const on = new Map(); for (let v = 1; v <= 90; v++) on.set(v, ordScore(p, v) / omx)
      rows.push({ rm, on, real: draws[t][2][p], banda: statoRegolaPerPosizione(h) })
    }
    return rows
  }
  const trainRows = buildCache(tf, tt), examRows = buildCache(ef, et)
  const evalRows = (rows, weights, base, alpha, useBanda) => {
    let hit = 0
    for (const row of rows) {
      let sc = new Map()
      if (base === 'ordstat') { for (let v = 1; v <= 90; v++) sc.set(v, row.on.get(v)) }
      else {
        for (let v = 1; v <= 90; v++) { let s = 0; for (const k of KEYS) s += (row.rm[k].get(v) || 0) * (weights[k] || 0); sc.set(v, s) }
        if (base === 'miscela') { let mx = 1e-9; for (const val of sc.values()) if (val > mx) mx = val; for (let v = 1; v <= 90; v++) sc.set(v, (1 - alpha) * (sc.get(v) / mx) + alpha * row.on.get(v)) }
      }
      if (useBanda) { const rk = [...sc.entries()].sort((a, b) => b[1] - a[1]); const w = new Map(); rk.forEach(([num], i) => w.set(num, sc.get(num) * fattorePeso(row.banda[p], i + 1))); sc = w }
      const t3 = [...sc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0])
      if (t3.includes(row.real)) hit++
    }
    return hit
  }
  const weights = {}; KEYS.forEach(k => weights[k] = baseSet.rules[k] != null ? baseSet.rules[k] : (CORE_KEYS.includes(k) ? 1 : 0))
  const levels = [0, 0.5, 1, 1.5, 2]
  let banda = false
  for (let pass = 0; pass < 2; pass++) for (const k of KEYS) {
    let bestL = weights[k], bestSc = evalRows(trainRows, weights, 'composito', 1, banda)
    for (const L of levels) { const sc = evalRows(trainRows, { ...weights, [k]: L }, 'composito', 1, banda); if (sc > bestSc) { bestSc = sc; bestL = L } }
    weights[k] = bestL
  }
  banda = evalRows(trainRows, weights, 'composito', 1, true) > evalRows(trainRows, weights, 'composito', 1, false)
  const compSc = evalRows(trainRows, weights, 'composito', 1, banda)
  const ordSc = evalRows(trainRows, {}, 'ordstat', 1, false)
  let best
  if (compSc >= ordSc) best = { ...baseSet, base: 'composito', alpha: 1, rules: weights, banda }
  else best = { ...baseSet, base: 'ordstat', alpha: 1, rules: { ...baseSet.rules }, banda: false }
  const trainHit = best.base === 'ordstat' ? ordSc : compSc
  const examHit = evalRows(examRows, best.rules, best.base, best.alpha, best.banda)
  return { best, trainHit, examHit }
}
function backtestUnaPos(draws, set, p, fromYM, toYM) {
  let hit3 = 0
  const usaBanda = set.banda
  for (let t = 1; t < draws.length; t++) {
    const y = ymOf(draws[t]); if (y < fromYM || y > toYM) continue
    const h = draws.slice(0, t)
    const banda = usaBanda ? statoRegolaPerPosizione(h) : null
    const ranked = rankingPos(h, p, set, banda)
    if (ranked.slice(0, 3).map(r => r.num).includes(draws[t][2][p])) hit3++
  }
  return hit3
}

// ---------- UI ----------
const parseM = s => { if (!s) return null; const [a, m] = s.split('-').map(Number); return a * 100 + m }
const LABELS = POSITION_LABELS || ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']
const nuovoSet = () => ({ base: 'composito', alpha: 0.75, rules: { ...ALL_RULES }, banda: false, numMin: 1, numMax: 90, rankMin: 1, rankMax: 90, locked: false })
// il "motore attuale": composito con tutte le regole + banda (come gira Genera)
const MOTORE_ATTUALE = () => [0, 1, 2, 3, 4, 5].map(() => ({ base: 'composito', alpha: 1, rules: { ...ALL_RULES }, banda: true, numMin: 1, numMax: 90, rankMin: 1, rankMax: 90 }))

function Toggle({ on, set, label, color = v.accent }) {
  return (
    <button onClick={() => set(!on)} style={{
      padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: MONO, fontSize: 11,
      border: `1px solid ${on ? color : v.borderHi}`, background: on ? color : 'transparent', color: on ? v.bg : v.text
    }}>{label}</button>
  )
}

// cursore di PESO per fattore: 0 = spento, fino a 2 = doppio contributo
function WeightSlider({ label, value, set, color }) {
  const on = value > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '48%', minWidth: 128 }}>
      <span style={{ fontFamily: MONO, fontSize: 10, color: on ? color : v.muted, width: 62 }}>{label}</span>
      <input type="range" min="0" max="2" step="0.5" value={value} onChange={e => set(parseFloat(e.target.value))} style={{ flex: 1, accentColor: color }} />
      <span style={{ fontFamily: MONO, fontSize: 10, color: on ? color : v.dim, width: 16 }}>{value}</span>
    </div>
  )
}

export default function Statistica({ draws }) {
  const [trainFrom, setTrainFrom] = useState('2026-03')
  const [trainTo, setTrainTo] = useState('2026-06')
  const [testFrom, setTestFrom] = useState('2026-07')
  const [testTo, setTestTo] = useState('2026-08')
  const [sets, setSets] = useState([0, 1, 2, 3, 4, 5].map(nuovoSet))
  const [posSel, setPosSel] = useState(0)
  const [res, setRes] = useState(null)
  const [computing, setComputing] = useState(false)
  const [avviso, setAvviso] = useState(null)
  const [ricerca, setRicerca] = useState(null)
  const [searching, setSearching] = useState(false)
  const [genRes, setGenRes] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [selGen, setSelGen] = useState(0)
  const [patternRes, setPatternRes] = useState(null)
  const [patternComputing, setPatternComputing] = useState(false)
  const [tolExact, setTolExact] = useState(1)
  const [propPct, setPropPct] = useState(40)
  const [winW, setWinW] = useState(3)
  const [analogiaRes, setAnalogiaRes] = useState(null)
  const [analogiaComputing, setAnalogiaComputing] = useState(false)
  const [genIntuito, setGenIntuito] = useState(null)
  const [generatingIntuito, setGeneratingIntuito] = useState(false)
  const [selIntuito, setSelIntuito] = useState(0)

  const cur = sets[posSel]
  const upd = (campo, val) => setSets(a => a.map((s, i) => i === posSel ? { ...s, [campo]: val } : s))
  const updRule = (k, val) => setSets(a => a.map((s, i) => i === posSel ? { ...s, rules: { ...s.rules, [k]: val } } : s))
  const periods = () => ({ tf: parseM(trainFrom), tt: parseM(trainTo), ef: parseM(testFrom), et: parseM(testTo) })
  const hs = useMemo(() => historicalSeries(draws, 15), [draws])
  const futureLabel = useMemo(() => stimaProssimaData(draws), [draws])
  const projGen = useMemo(() => {
    if (!genRes || !genRes.length) return null
    const s = genRes[Math.min(selGen, genRes.length - 1)]
    return buildProjection(hs, futureLabel, s.nums, s.dett.map(d => d.rank))
  }, [genRes, selGen, hs, futureLabel])
  const projIntuito = useMemo(() => {
    if (!genIntuito || !genIntuito.length) return null
    const s = genIntuito[Math.min(selIntuito, genIntuito.length - 1)]
    return buildProjection(hs, futureLabel, s.nums, s.dett.map(d => d.rank))
  }, [genIntuito, selIntuito, hs, futureLabel])

  const calcola = () => {
    setComputing(true); setAvviso(null); setRicerca(null)
    setTimeout(() => {
      const { tf, tt, ef, et } = periods()
      const mot = MOTORE_ATTUALE()
      setRes({
        trainS: backtestMix(draws, sets, tf, tt), trainM: backtestMix(draws, mot, tf, tt),
        testS: backtestMix(draws, sets, ef, et), testM: backtestMix(draws, mot, ef, et),
        trainPremi: premiMix(draws, sets, tf, tt), testPremi: premiMix(draws, sets, ef, et)
      })
      setComputing(false)
    }, 30)
  }

  const cerca = () => {
    setSearching(true); setRicerca(null); setAvviso(null)
    setTimeout(() => {
      const { tf, tt, ef, et } = periods()
      setRicerca({ p: posSel, ...cercaPosizione(draws, cur, posSel, tf, tt, ef, et) })
      setSearching(false)
    }, 30)
  }
  const applicaRicerca = () => {
    if (!ricerca) return
    const b = ricerca.best
    setSets(a => a.map((s, i) => i === posSel ? { ...s, base: b.base, alpha: b.alpha, banda: b.banda, rules: { ...b.rules } } : s))
  }

  const generaConMix = () => {
    setGenerating(true); setGenRes(null); setSelGen(0)
    setTimeout(() => { setGenRes(generaMix(draws, sets, 8)); setGenerating(false) }, 30)
  }

  const analizzaPatternClick = () => {
    setPatternComputing(true); setPatternRes(null)
    setTimeout(() => {
      const { tf, tt, ef, et } = periods()
      setPatternRes(analizzaPattern(draws, tf, tt, ef, et, tolExact, propPct))
      setPatternComputing(false)
    }, 30)
  }

  const cercaAnalogiaClick = () => {
    setAnalogiaComputing(true); setAnalogiaRes(null); setGenIntuito(null)
    setTimeout(() => { const r = trovaAnalogia(draws, winW, tolExact, propPct); setAnalogiaRes(r === null ? { corto: true } : { rows: r }); setAnalogiaComputing(false) }, 30)
  }

  const generaIntuitoClick = () => {
    if (!analogiaRes || !analogiaRes.rows) return
    setGeneratingIntuito(true); setGenIntuito(null); setSelIntuito(0)
    setTimeout(() => { setGenIntuito(generaConIntuito(draws, sets, analogiaRes.rows, 6)); setGeneratingIntuito(false) }, 30)
  }

  const toggleLock = () => upd('locked', !cur.locked)
  const applicaTutte = () => setSets(a => a.map(s => s.locked ? s : { ...s, base: cur.base, alpha: cur.alpha, rules: { ...cur.rules }, banda: cur.banda }))

  const salva = () => {
    try {
      localStorage.setItem('sonar_setting_mix', JSON.stringify(sets))
      if (res && somma(res.testS.hit3) < somma(res.testM.hit3)) {
        setAvviso(`Salvato. Avviso: all'esame questo mix fa ${somma(res.testS.hit3)} contro ${somma(res.testM.hit3)} del tuo motore attuale — sul futuro potrebbe rendere meno. L'hai salvato lo stesso, la scelta è tua.`)
      } else {
        setAvviso('Salvato. ' + (res ? 'Batte (o pareggia) il tuo motore all\'esame.' : 'Nessun backtest eseguito: salvato senza verifica.'))
      }
    } catch (e) { setAvviso('Non sono riuscito a salvare nella memoria del browser.') }
  }

  const rigaPos = (nome, s, m, esame) => (
    <div style={{ ...styles.card, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontFamily: MONO, color: esame ? v.accent : v.text, fontSize: 12 }}>{nome}</strong>
        <span style={{ fontSize: 11, color: v.muted, fontFamily: MONO }}>{s.n} estr.</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: MONO }}>
        <thead><tr>
          <th style={{ textAlign: 'left', color: v.muted, padding: '2px 3px' }}>hit@3</th>
          {LABELS.map(l => <th key={l} style={{ color: v.muted, padding: '2px 3px' }}>{l}</th>)}
          <th style={{ color: v.muted, padding: '2px 3px' }}>tot</th>
        </tr></thead>
        <tbody>
          <tr>
            <td style={{ color: v.text, padding: '2px 3px' }}>mix</td>
            {s.hit3.map((x, i) => {
              const meglio = x > m.hit3[i], peggio = x < m.hit3[i]
              return <td key={i} style={{ textAlign: 'center', padding: '2px 3px', color: meglio ? v.green : peggio ? v.hot : v.text }}>{x}</td>
            })}
            <td style={{ textAlign: 'center', color: v.accent, fontWeight: 700, padding: '2px 3px' }}>{somma(s.hit3)}</td>
          </tr>
          <tr>
            <td style={{ color: v.muted, padding: '2px 3px' }}>motore</td>
            {m.hit3.map((x, i) => <td key={i} style={{ textAlign: 'center', color: v.muted, padding: '2px 3px' }}>{x}</td>)}
            <td style={{ textAlign: 'center', color: v.muted, fontWeight: 700, padding: '2px 3px' }}>{somma(m.hit3)}</td>
          </tr>
        </tbody>
      </table>
      {esame && <div style={{ fontSize: 11, marginTop: 5, fontFamily: MONO, color: somma(s.hit3) >= somma(m.hit3) ? v.green : v.hot }}>
        {somma(s.hit3) >= somma(m.hit3) ? '✓ il mix regge sul futuro' : '✗ il mix perde sul futuro (probabile rumore) — ma decidi tu'}
      </div>}
    </div>
  )

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Statistica — laboratorio per posizione</h2>
        <p style={styles.caption}>
          Tari un settaggio <strong style={{ color: v.text }}>per ogni posizione</strong> su un periodo, e lo esamini su uno
          <strong style={{ color: v.text }}> successivo</strong>. Il confronto è col <strong style={{ color: v.text }}>tuo motore attuale</strong>.
          Dove sei soddisfatto, <strong style={{ color: v.text }}>fissi</strong> la posizione e lavori sulle altre. Nessun blocco: gli avvisi ti informano, decidi tu.
        </p>

        {/* banner informato fisso */}
        <div style={{ background: `${v.gold}12`, border: `1px solid ${v.gold}44`, borderRadius: 8, padding: '10px 12px', marginBottom: 12, fontSize: 11.5, color: v.text, lineHeight: 1.55 }}>
          <strong style={{ color: v.gold, fontFamily: MONO }}>Da tenere a mente.</strong> Questo esplora il gioco <strong style={{ color: v.text }}>per posizione</strong>. L'<strong style={{ color: v.text }}>esame</strong> è il giudice: ciò che brilla in taratura ma non regge all'esame è <strong style={{ color: v.text }}>rumore</strong>. E i <strong style={{ color: v.text }}>premi</strong> non si migliorano con nessun incastro — ogni sestina vale uguale (0,4 numeri attesi), è matematica. Serve a capire, non a battere il gioco.
        </div>

        {/* periodi */}
        <div style={{ ...styles.card, marginBottom: 10, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11, color: v.text, fontFamily: MONO, marginBottom: 4 }}>Taratura</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="month" value={trainFrom} onChange={e => setTrainFrom(e.target.value)} style={dateInput} />
              <span style={{ color: v.muted }}>→</span>
              <input type="month" value={trainTo} onChange={e => setTrainTo(e.target.value)} style={dateInput} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: v.accent, fontFamily: MONO, marginBottom: 4 }}>Esame</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input type="month" value={testFrom} onChange={e => setTestFrom(e.target.value)} style={dateInput} />
              <span style={{ color: v.muted }}>→</span>
              <input type="month" value={testTo} onChange={e => setTestTo(e.target.value)} style={dateInput} />
            </div>
          </div>
        </div>

        {/* selettore posizione */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
          {LABELS.map((l, p) => (
            <button key={l} onClick={() => setPosSel(p)} style={{
              flex: 1, padding: '7px 2px', borderRadius: 6, cursor: 'pointer', fontFamily: MONO, fontSize: 12,
              border: `1px solid ${posSel === p ? v.accent : v.border}`,
              background: posSel === p ? `${v.accent}1a` : v.card,
              color: sets[p].locked ? v.green : posSel === p ? v.accent : v.muted
            }}>{l}{sets[p].locked ? ' •' : ''}</button>
          ))}
        </div>

        {/* controlli della posizione selezionata */}
        <div style={{ ...styles.card, marginBottom: 10, opacity: cur.locked ? 0.6 : 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontFamily: MONO, color: v.text }}>{LABELS[posSel]}{cur.locked ? ' — fissata' : ''}</strong>
            <button onClick={toggleLock} style={{
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontFamily: MONO, fontSize: 11,
              border: `1px solid ${cur.locked ? v.green : v.borderHi}`, background: cur.locked ? v.green : 'transparent', color: cur.locked ? v.bg : v.text
            }}>{cur.locked ? '✓ fissata' : 'Fissa questa posizione'}</button>
          </div>
          <div style={{ fontSize: 11, color: v.muted, fontFamily: MONO, marginBottom: 6 }}>ranking</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: cur.base === 'miscela' ? 10 : 8 }}>
            {[['composito', 'Composito'], ['ordstat', 'Ordine'], ['miscela', 'Miscela'], ['regressione', 'Regr.']].map(([k, l]) => (
              <Toggle key={k} on={cur.base === k} set={() => upd('base', k)} label={l} />
            ))}
          </div>
          {cur.base === 'miscela' && (
            <div style={{ fontSize: 11, fontFamily: MONO, color: v.muted, marginBottom: 8 }}>
              peso ordine: {cur.alpha.toFixed(2)}
              <input type="range" min="0" max="1" step="0.05" value={cur.alpha} onChange={e => upd('alpha', parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ opacity: (cur.base === 'ordstat' || cur.base === 'regressione') ? 0.4 : 1, marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: v.dim, fontFamily: MONO, marginBottom: 4 }}>regole</div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {CORE_KEYS.map(k => <WeightSlider key={k} value={cur.rules[k] || 0} set={x => updRule(k, x)} label={RULE_LABEL[k]} color={v.green} />)}
            </div>
            <div style={{ fontSize: 10, color: v.dim, fontFamily: MONO, margin: '8px 0 4px' }}>scarti / sussurri <span style={{ color: v.hot }}>(bocciati o sotto-soglia — spenti di default)</span></div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {SCARTI_KEYS.map(k => <WeightSlider key={k} value={cur.rules[k] || 0} set={x => updRule(k, x)} label={RULE_LABEL[k]} color={v.hot} />)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <Toggle on={cur.banda} set={x => upd('banda', x)} label={cur.banda ? 'Banda: ON' : 'Banda: off'} />
            <span style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
              num<input type="number" value={cur.numMin} onChange={e => upd('numMin', +e.target.value)} style={miniInput} />–<input type="number" value={cur.numMax} onChange={e => upd('numMax', +e.target.value)} style={miniInput} />
            </span>
            <span style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
              rank<input type="number" value={cur.rankMin} onChange={e => upd('rankMin', +e.target.value)} style={miniInput} />–<input type="number" value={cur.rankMax} onChange={e => upd('rankMax', +e.target.value)} style={miniInput} />
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={cerca} disabled={searching} style={btnSec(searching)}>{searching ? 'cerco…' : 'Cerca per questa posizione'}</button>
            <button onClick={applicaTutte} style={btnSec(false)}>Applica a tutte (non fissate)</button>
          </div>
          {ricerca && ricerca.p === posSel && (
            <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: v.surface, border: `1px solid ${v.accent}55` }}>
              <div style={{ fontSize: 11, fontFamily: MONO, color: v.text }}>
                Migliore in taratura per {LABELS[posSel]}: <strong>{ricerca.best.base}{ricerca.best.base === 'miscela' ? ` α${ricerca.best.alpha}` : ''}{ricerca.best.banda ? ' + banda' : ''}</strong>
              </div>
              {ricerca.best.base !== 'ordstat' && (
                <div style={{ fontSize: 10, fontFamily: MONO, color: v.muted, marginTop: 4 }}>
                  pesi: {[...CORE_KEYS, ...SCARTI_KEYS].filter(k => (ricerca.best.rules[k] || 0) > 0).map(k => `${RULE_LABEL[k]} ${ricerca.best.rules[k]}`).join(' · ') || '(tutte a 0)'}
                </div>
              )}
              <div style={{ fontSize: 12, fontFamily: MONO, color: v.accent, marginTop: 6 }}>
                azzecca (hit@3): <strong>{ricerca.examHit}</strong> all'esame · {ricerca.trainHit} in taratura
              </div>
              <button onClick={applicaRicerca} style={{ ...btnSec(false), marginTop: 8 }}>Applica a {LABELS[posSel]} → sposta i cursori</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={calcola} disabled={computing || searching || generating} style={btnPri(computing)}>{computing ? 'calcolo…' : 'Calcola il mix'}</button>
          <button onClick={generaConMix} disabled={computing || searching || generating} style={btnSec(generating)}>{generating ? 'genero…' : 'Genera sestine col mix'}</button>
        </div>
      </section>

      {res && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Risultato del mix</h2>
          {rigaPos('Taratura — com\'è andata', res.trainS, res.trainM, false)}
          {rigaPos('Esame — se puoi fidartene', res.testS, res.testM, true)}
          <div style={{ ...styles.card, marginBottom: 8 }}>
            <div style={{ fontFamily: MONO, color: v.gold, fontSize: 12, marginBottom: 8 }}>Premi reali del mix (una sestina per estrazione)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: MONO }}>
              <thead><tr>
                <th style={{ textAlign: 'left', color: v.muted, padding: '2px 4px' }}>punti</th>
                {['2', '3', '4', '5', '5+J', '6'].map(k => <th key={k} style={{ color: v.muted, padding: '2px 4px' }}>{k}</th>)}
              </tr></thead>
              <tbody>
                {[['taratura', res.trainPremi], ['esame', res.testPremi]].map(([nome, pr]) => (
                  <tr key={nome}>
                    <td style={{ color: nome === 'esame' ? v.accent : v.text, padding: '2px 4px' }}>{nome}</td>
                    {['2', '3', '4', '5', '5+J', '6'].map(k => <td key={k} style={{ textAlign: 'center', padding: '2px 4px', color: pr[k] > 0 ? (k === '2' ? v.text : v.green) : v.dim }}>{pr[k]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 10.5, color: v.dim, marginTop: 6, lineHeight: 1.5 }}>
              Un "2" paga briciole; il primo premio vero è il "3". Qualunque mix, questi numeri restano attorno al caso — è la conferma in vincite di quello che sai.
            </div>
          </div>
          <button onClick={salva} style={{ width: '100%', padding: 10, borderRadius: 8, fontFamily: MONO, fontSize: 13, marginTop: 4, cursor: 'pointer', border: `1px solid ${v.accent}`, background: 'transparent', color: v.accent }}>
            Salva questo mix
          </button>
          {avviso && <div style={{ marginTop: 8, padding: 12, borderRadius: 8, background: `${v.gold}14`, border: `1px solid ${v.gold}55`, fontSize: 12, color: v.text, lineHeight: 1.5 }}>{avviso}</div>}
        </section>
      )}

      {genRes && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Sestine col mix in prova</h2>
          <p style={styles.caption}>
            Generate col settaggio che stai tarando qui sopra — <strong style={{ color: v.text }}>non</strong> col motore attuale, così le confronti con la pagina Genera.
            Tocca una sestina per vederla sul grafico; ogni numero mostra il suo rank nella posizione, come nella pagina principale.
          </p>
          {genRes.length === 0 && <p style={{ color: v.hot, fontSize: 13 }}>I filtri per posizione sono troppo stretti per formare una sestina valida — allarga gli intervalli.</p>}
          {projGen && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: v.muted, margin: '0 0 6px' }}>Sestina #{selGen + 1} proiettata alla prossima estrazione ({futureLabel})</div>
              <PosizioniChart columns={projGen.columns} lines={projGen.lines} jolly={projGen.jolly} />
            </div>
          )}
          {genRes.map((s, i) => (
            <div key={i} onClick={() => setSelGen(i)} style={{ ...styles.card, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8, cursor: 'pointer', outline: selGen === i ? `2px solid ${v.accent}` : 'none' }}>
              {s.dett.map((d, j) => (
                <div key={j} style={{ textAlign: 'center' }}>
                  <span style={{ ...ballStyle(P[j % 6], 40, 15), margin: '0 auto' }}>{d.num}</span>
                  <div style={{ fontSize: 10, color: v.muted, marginTop: 4, fontFamily: MONO }}>P{j + 1} · r{d.rank}/{d.pool}</div>
                </div>
              ))}
              <div style={{ width: '100%', fontSize: 10, color: v.dim, fontFamily: MONO, marginTop: 4 }}>#{i + 1} · rank medio {s.rankMedio.toFixed(1)}</div>
            </div>
          ))}
        </section>
      )}

      <section style={styles.section}>
        <h2 style={styles.h2}>Pattern dei delta tra posizioni adiacenti</h2>
        <p style={styles.caption}>
          Per ogni estrazione, il delta tra posizioni vicine (P2−P1, P3−P2…). Guardiamo se si ripresenta — uguale o in
          proporzione — più forte alla <strong style={{ color: v.text }}>distanza 1</strong> (l'estrazione successiva) che a distanze
          maggiori (2, 3, 5 dopo) — <strong style={{ color: v.text }}>sempre nell'ordine reale</strong>, nessuna estrazione spostata dal suo posto.
          Se il pattern è vero, la distanza 1 dovrebbe spiccare; se tutte le distanze sono simili, è la forma dei numeri, non una relazione nel tempo.
        </p>
        <div style={{ ...styles.card, marginBottom: 10, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
            tolleranza esatta ±<input type="number" min="0" max="10" value={tolExact} onChange={e => setTolExact(+e.target.value)} style={miniInput} />
          </span>
          <span style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
            banda proporzionale ±<input type="number" min="0" max="100" value={propPct} onChange={e => setPropPct(+e.target.value)} style={miniInput} />%
          </span>
          <button onClick={analizzaPatternClick} disabled={patternComputing} style={btnSec(patternComputing)}>{patternComputing ? 'analizzo…' : 'Analizza pattern'}</button>
        </div>

        {patternRes && (
          <div style={{ ...styles.card }}>
            <div style={{ fontSize: 10, color: v.dim, fontFamily: MONO, marginBottom: 8 }}>taratura n={patternRes.nTrain} · esame n={patternRes.nExam} (sequenza reale, non mescolata)</div>
            {patternRes.rows.map((r, i) => (
              <div key={i} style={{ padding: '8px 0', borderTop: i ? `1px solid ${v.border}` : 'none' }}>
                <div style={{ fontFamily: MONO, fontSize: 12, color: v.accent, marginBottom: 5 }}>{r.label}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5, fontFamily: MONO }}>
                  <thead><tr>
                    <th style={{ textAlign: 'left', color: v.muted, padding: '1px 4px' }}></th>
                    {r.exact.map(x => <th key={x.lag} style={{ color: x.lag === 1 ? v.text : v.muted, padding: '1px 4px' }}>dist.{x.lag}</th>)}
                  </tr></thead>
                  <tbody>
                    <tr>
                      <td style={{ color: v.muted, padding: '1px 4px' }}>esatto tar.</td>
                      {r.exact.map(x => <td key={x.lag} style={{ textAlign: 'center', padding: '1px 4px', color: x.lag === 1 ? v.text : v.dim }}>{x.train !== null ? (100 * x.train).toFixed(0) + '%' : '—'}</td>)}
                    </tr>
                    <tr>
                      <td style={{ color: v.muted, padding: '1px 4px' }}>esatto esa.</td>
                      {r.exact.map(x => <td key={x.lag} style={{ textAlign: 'center', padding: '1px 4px', color: x.lag === 1 ? v.accent : v.dim }}>{x.exam !== null ? (100 * x.exam).toFixed(0) + '%' : '—'}</td>)}
                    </tr>
                    <tr>
                      <td style={{ color: v.muted, padding: '1px 4px' }}>proporz. tar.</td>
                      {r.prop.map(x => <td key={x.lag} style={{ textAlign: 'center', padding: '1px 4px', color: x.lag === 1 ? v.text : v.dim }}>{x.train !== null ? (100 * x.train).toFixed(0) + '%' : '—'}</td>)}
                    </tr>
                    <tr>
                      <td style={{ color: v.muted, padding: '1px 4px' }}>proporz. esa.</td>
                      {r.prop.map(x => <td key={x.lag} style={{ textAlign: 'center', padding: '1px 4px', color: x.lag === 1 ? v.accent : v.dim }}>{x.exam !== null ? (100 * x.exam).toFixed(0) + '%' : '—'}</td>)}
                    </tr>
                  </tbody>
                </table>
                {r.top.length > 0 && (
                  <div style={{ fontSize: 10, color: v.dim, fontFamily: MONO, marginTop: 4 }}>
                    pattern trovati in taratura (distanza 1): {r.top.map(t => `Δ${t.val}→Δ${t.val} (${t.nTrain}× tar., ${t.nExam}× in esame)`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: v.dim, marginTop: 10, lineHeight: 1.5 }}>
              Guarda "dist.1" — se è chiaramente più alto delle distanze 2/3/5, sia in taratura sia in esame, è un segnale di prossimità reale.
              Se dist.1 non si distingue dalle altre, il tasso viene dalla forma dei numeri, non dal tempo. Su periodi brevi il campione è
              piccolo — un segnale isolato può essere rumore; guarda se regge cambiando i periodi.
            </div>
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Analogia con lo storico</h2>
        <p style={styles.caption}>
          Per ogni posizione, il delta con la successiva (P2−P1, P3−P2…) tracciato estrazione dopo estrazione — è l'onda che sale
          e scende nel tempo. Un solo grafico con le 5 onde <strong style={{ color: v.text }}>sovrapposte</strong>, per vedere se si muovono insieme.
          Cerca <strong style={{ color: v.text }}>ovunque nello storico</strong>, in ordine reale, finestre con la stessa forma — e per ciascuna
          dice cosa è successo <strong style={{ color: v.text }}>dopo</strong>: simile, opposto, o diverso rispetto all'ultimo punto. Stessa tolleranza e banda della sezione sopra.
        </p>
        <div style={{ ...styles.card, marginBottom: 10, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
            ultime <input type="number" min="2" max="5" value={winW} onChange={e => setWinW(Math.max(2, Math.min(5, +e.target.value)))} style={miniInput} /> estrazioni
          </span>
          <button onClick={cercaAnalogiaClick} disabled={analogiaComputing} style={btnSec(analogiaComputing)}>{analogiaComputing ? 'cerco…' : 'Cerca nello storico'}</button>
        </div>

        {analogiaRes && analogiaRes.rows && (
          <div style={{ ...styles.card }}>
            <div style={{ marginBottom: 6 }}>
              <MultiWave series={analogiaRes.rows.map((r, idx) => ({ label: r.label, values: r.serie, color: P[idx % 6] }))} evid={winW} />
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10, fontSize: 10, fontFamily: MONO }}>
              {analogiaRes.rows.map((r, idx) => (
                <span key={idx} style={{ color: v.muted }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: P[idx % 6], borderRadius: 2, marginRight: 3 }} />{r.label}
                </span>
              ))}
              <span style={{ color: v.dim }}>· linea verticale = inizio finestra attuale</span>
            </div>
            {analogiaRes.rows.map((r, i) => (
              <div key={i} style={{ padding: '9px 0', borderTop: i ? `1px solid ${v.border}` : 'none' }}>
                <div style={{ fontFamily: MONO, fontSize: 12, marginBottom: 3 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, background: P[i % 6], borderRadius: 2, marginRight: 4 }} />
                  <span style={{ color: v.accent }}>{r.label}</span> <span style={{ color: v.dim }}>· finestra attuale Δ{r.cur.join(',Δ')}</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 10.5, color: v.text, marginTop: 2 }}>
                  {r.n} casi trovati — simile {(100 * r.simile).toFixed(0)}% · opposto {(100 * r.opposto).toFixed(0)}% · diverso {(100 * r.diverso).toFixed(0)}%
                </div>
                <div style={{ fontSize: 11, color: v.gold, fontFamily: MONO, marginTop: 3 }}>{r.verdetto}</div>
                {r.esempi.length > 0 && (
                  <div style={{ fontSize: 10, color: v.dim, fontFamily: MONO, marginTop: 3 }}>
                    ultimi casi: {r.esempi.map(e => `${e.data}→Δ${e.nextDelta}(${e.cls})`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            <div style={{ fontSize: 10.5, color: v.dim, marginTop: 10, lineHeight: 1.5 }}>
              "Simile/opposto/diverso" è rispetto all'ultimo delta della finestra, non una previsione certa — è la distribuzione reale di
              tutte le volte che questo esatto pattern si è visto nello storico. Con pochi casi (sotto 5) il numero non dice nulla.
            </div>
            <button onClick={generaIntuitoClick} disabled={generatingIntuito} style={{ ...btnPri(generatingIntuito), marginTop: 10 }}>
              {generatingIntuito ? 'genero…' : 'Genera sestine con l\'intuito'}
            </button>
          </div>
        )}
        {analogiaRes && analogiaRes.corto && (
          <p style={{ color: v.hot, fontSize: 13 }}>Storico troppo corto per una finestra di {winW} estrazioni.</p>
        )}
      </section>

      {genIntuito && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Sestine con l'intuito</h2>
          <p style={styles.caption}>
            Costruite dal ranking di ogni posizione (le regole che hai configurato) scegliendo, dove l'analogia ha dato un'indicazione,
            il candidato più vicino al delta previsto. Dove non c'era un'indicazione, decide il ranking normale. Tocca una sestina per il grafico.
          </p>
          {genIntuito.length === 0 && <p style={{ color: v.hot, fontSize: 13 }}>Nessuna combinazione valida trovata con questi bersagli.</p>}
          {projIntuito && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: v.muted, margin: '0 0 6px' }}>Sestina #{selIntuito + 1} proiettata alla prossima estrazione ({futureLabel})</div>
              <PosizioniChart columns={projIntuito.columns} lines={projIntuito.lines} jolly={projIntuito.jolly} />
            </div>
          )}
          {genIntuito.map((s, i) => (
            <div key={i} onClick={() => setSelIntuito(i)} style={{ ...styles.card, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8, cursor: 'pointer', outline: selIntuito === i ? `2px solid ${v.accent}` : 'none' }}>
              {s.dett.map((d, j) => (
                <div key={j} style={{ textAlign: 'center' }}>
                  <span style={{ ...ballStyle(P[j % 6], 40, 15), margin: '0 auto' }}>{d.num}</span>
                  <div style={{ fontSize: 10, color: v.muted, marginTop: 4, fontFamily: MONO }}>P{j + 1} · r{d.rank}/{d.pool}</div>
                </div>
              ))}
              <div style={{ width: '100%', fontSize: 10, color: v.dim, fontFamily: MONO, marginTop: 4 }}>#{i + 1} · rank medio {s.rankMedio.toFixed(1)}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

const dateInput = { padding: '6px 8px', borderRadius: 6, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO, fontSize: 12 }
const miniInput = { width: 40, margin: '0 2px', padding: '3px 4px', borderRadius: 5, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO, fontSize: 12 }
const btnPri = (busy) => ({ width: '100%', padding: 12, borderRadius: 8, fontFamily: MONO, fontSize: 14, cursor: busy ? 'default' : 'pointer', border: 'none', background: busy ? v.borderHi : v.accent, color: v.bg, fontWeight: 700 })
const btnSec = (busy) => ({ flex: 1, padding: '9px 8px', borderRadius: 7, fontFamily: MONO, fontSize: 11, cursor: busy ? 'default' : 'pointer', border: `1px solid ${v.accent}`, background: 'transparent', color: v.accent })
