#!/usr/bin/env node
// Sistema di ricalibrazione automatica periodica.
// Riprova sistematicamente varianti dei parametri gia' noti (finestre,
// centri, larghezze) sul dataset che cresce, con lo stesso rigore statistico
// usato in tutta la sessione di ricerca: baseline dinamica, confronto
// appaiato, verifica SIA a livello di rank isolato SIA a livello di sestina
// completa (i due possono contraddirsi, lo abbiamo verificato piu' volte).
// Non modifica mai il motore in produzione da solo — scrive un report per
// una revisione umana/in chat prima di qualunque adozione.

import fs from 'fs'
import path from 'path'

const DRAWS_PATH = path.resolve('src/data/draws.js')
const REPORT_PATH = path.resolve('RICALIBRAZIONE_REPORT.md')
const MIN_HISTORY = 210

// ---------- Caricamento dati ----------
function loadDraws() {
  const raw = fs.readFileSync(DRAWS_PATH, 'utf8')
  const match = raw.match(/const SEED_DRAWS = (\[[\s\S]*?\n\])/)
  return eval(match[1]) // [[data, concorso, [n1..n6], jolly], ...]
}

// ---------- Blocchi costitutivi del motore (parametrizzati) ----------
function normalize(map) {
  const vals = [...map.values()]
  const max = Math.max(...vals, 1e-9)
  const out = new Map()
  for (const [k, v] of map.entries()) out.set(k, v / max)
  return out
}
function decadeOf(n) { return Math.floor((n - 1) / 10) }

function hotVStratified(history, position, window, decadeWindow) {
  const recentForDecade = history.slice(-decadeWindow)
  const decadeFreq = new Map()
  for (const d of recentForDecade) { const dec = decadeOf(d[2][position]); decadeFreq.set(dec, (decadeFreq.get(dec) || 0) + 1) }
  const dominantDecade = [...decadeFreq.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  const filteredHistory = history.filter(d => decadeOf(d[2][position]) === dominantDecade)
  const recent = filteredHistory.slice(-window)
  const freq = new Map()
  for (const d of recent) { const n = d[2][position]; freq.set(n, (freq.get(n) || 0) + 1) }
  return freq
}
function delayScores(history, position, center, sigma) {
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
function decadeScores(history, position, window) {
  const recent = history.slice(-window)
  const decadeFreq = new Map()
  for (const d of recent) { const dec = decadeOf(d[2][position]); decadeFreq.set(dec, (decadeFreq.get(dec) || 0) + 1) }
  const allSeen = new Set(history.map(d => d[2][position]))
  const out = new Map()
  for (const n of allSeen) out.set(n, decadeFreq.get(decadeOf(n)) || 0)
  return out
}
function clusterScores(history, position, maxLag) {
  const n = history.length
  const scores = new Map()
  for (let lag = 1; lag <= maxLag && lag <= n; lag++) {
    const num = history[n - lag][2][position]
    scores.set(num, (scores.get(num) || 0) + 1 / lag)
  }
  return scores
}
function volatilityScores(history, position, window) {
  const recent = history.slice(-window).map(d => d[2][position])
  const mean = recent.reduce((s, n) => s + n, 0) / recent.length
  const variance = recent.reduce((s, n) => s + (n - mean) ** 2, 0) / recent.length
  const sigma = Math.max(Math.sqrt(variance), 3)
  const allSeen = new Set(history.map(d => d[2][position]))
  const scores = new Map()
  for (const n of allSeen) scores.set(n, Math.exp(-((n - mean) ** 2) / (2 * sigma * sigma)))
  return scores
}
function coldHScores(history, position, window) {
  const recent = history.slice(-window)
  const freq = new Map()
  for (const d of recent) for (const n of d[2]) freq.set(n, (freq.get(n) || 0) + 1)
  const allSeen = new Set(history.map(d => d[2][position]))
  const scores = new Map()
  for (const n of allSeen) scores.set(n, 1 / (1 + (freq.get(n) || 0)))
  return scores
}

// Parametri di PRODUZIONE attuali (riferimento — copiati da src/engine/scoring.js)
const PROD = {
  hotWindow: 10, hotDecadeWindow: 20,
  delayCenters: [9, 5, 5, 21, 9, 5], delaySigma: 6,
  decadeWindow: 20,
  clusterMaxLag: 5,
  volWindow: 20,
  coldWindow: 10
}

function compositeScores(history, position, params) {
  const hot = normalize(hotVStratified(history, position, params.hotWindow, params.hotDecadeWindow))
  const delay = normalize(delayScores(history, position, params.delayCenters[position], params.delaySigma))
  const dec = normalize(decadeScores(history, position, params.decadeWindow))
  const clus = normalize(clusterScores(history, position, params.clusterMaxLag))
  const vol = normalize(volatilityScores(history, position, params.volWindow))
  const cold = normalize(coldHScores(history, position, params.coldWindow))
  const all = new Set([...hot.keys(), ...delay.keys(), ...dec.keys(), ...clus.keys(), ...vol.keys(), ...cold.keys()])
  const scores = new Map()
  for (const n of all) scores.set(n, (hot.get(n) || 0) + (delay.get(n) || 0) + (dec.get(n) || 0) + (clus.get(n) || 0) + (vol.get(n) || 0) + (cold.get(n) || 0))
  return scores
}
function rankedCandidates(history, position, params) {
  return [...compositeScores(history, position, params).entries()].sort((a, b) => b[1] - a[1])
}

// ---------- Test a livello di RANK isolato (veloce, walk-forward) ----------
function rankTest(draws, position, params, testSize) {
  const n = draws.length
  const startAt = Math.max(MIN_HISTORY, n - testSize)
  let top10 = 0, top20 = 0, tot = 0
  const hits = [] // per il confronto appaiato
  for (let t = startAt; t < n; t++) {
    const history = draws.slice(0, t)
    const ranked = rankedCandidates(history, position, params)
    const actual = draws[t][2][position]
    const idx = ranked.findIndex(([num]) => num === actual)
    const rank = idx >= 0 ? idx + 1 : ranked.length + 1
    tot++
    hits.push(rank <= 10 ? 1 : 0)
    if (rank <= 10) top10++
    if (rank <= 20) top20++
  }
  return { pctTop10: (top10 / tot) * 100, pctTop20: (top20 / tot) * 100, hits, tot }
}

// Confronto appaiato (McNemar semplificato / z-test su proporzioni appaiate)
function paired_zTest(hitsA, hitsB) {
  let soloA = 0, soloB = 0 // A vince (A=1,B=0) vs B vince (A=0,B=1)
  for (let i = 0; i < hitsA.length; i++) {
    if (hitsA[i] === 1 && hitsB[i] === 0) soloA++
    else if (hitsA[i] === 0 && hitsB[i] === 1) soloB++
  }
  const totDiscordanti = soloA + soloB
  if (totDiscordanti === 0) return 0
  return (soloB - soloA) / Math.sqrt(totDiscordanti) // z approssimato, positivo = B (variante) meglio di A (base)
}

// ---------- Griglia di parametri da riprovare (bounded, basata su cio' che sappiamo) ----------
const GRIGLIA = {
  hotWindow: [5, 10, 15, 20],
  decadeWindow: [15, 20, 25, 30],
  clusterMaxLag: [3, 5, 7, 10],
  volWindow: [15, 20, 25],
  coldWindow: [5, 10, 15, 20]
}

const RANK_TEST_SIZE = 1200 // campione ampio ma nei tempi per l'esecuzione periodica
const SIGNIFICATIVITA_MIN = 1.96 // stessa soglia usata in tutta la sessione

function testParametro(draws, nomeParam, valore) {
  const paramsVariante = { ...PROD, [nomeParam]: valore }
  const righe = []
  let miglioramentoNetto = 0
  for (let p = 0; p < 6; p++) {
    const base = rankTest(draws, p, PROD, RANK_TEST_SIZE)
    const variante = rankTest(draws, p, paramsVariante, RANK_TEST_SIZE)
    const z = paired_zTest(base.hits, variante.hits)
    righe.push({ posizione: p + 1, top10Base: base.pctTop10, top10Variante: variante.pctTop10, z })
    if (z > 0) miglioramentoNetto++
  }
  return { nomeParam, valore, righe, posizioniMigliorate: miglioramentoNetto }
}

// ---------- Esecuzione ----------
function main() {
  console.log('Ricalibrazione automatica: carico le estrazioni...')
  const draws = loadDraws()
  console.log(`Estrazioni disponibili: ${draws.length}`)

  const candidatiPromettenti = []
  const tuttiRisultati = []

  for (const [nomeParam, valori] of Object.entries(GRIGLIA)) {
    const valoreAttuale = PROD[nomeParam]
    for (const valore of valori) {
      if (valore === valoreAttuale) continue // e' gia' il valore di produzione
      console.log(`Provo ${nomeParam}=${valore} (attuale: ${valoreAttuale})...`)
      const risultato = testParametro(draws, nomeParam, valore)
      tuttiRisultati.push(risultato)

      // Promettente se migliora (z>1.96, statisticamente significativo) in
      // ALMENO 4 posizioni su 6, e non peggiora in modo significativo in nessuna
      const zSignificativi = risultato.righe.filter(r => r.z > SIGNIFICATIVITA_MIN).length
      const zPeggiorativiSignificativi = risultato.righe.filter(r => r.z < -SIGNIFICATIVITA_MIN).length
      if (zSignificativi >= 4 && zPeggiorativiSignificativi === 0) {
        candidatiPromettenti.push(risultato)
      }
    }
  }

  // ---------- Report ----------
  const dataOggi = new Date().toISOString().split('T')[0]
  let report = `# Report di ricalibrazione automatica — ${dataOggi}\n\n`
  report += `Estrazioni analizzate: ${draws.length}. Campione di test per il rank isolato: ultime ${RANK_TEST_SIZE}.\n\n`
  report += `**Importante:** questo report testa SOLO il rank isolato (veloce, eseguibile periodicamente). `
  report += `La sessione di ricerca ha mostrato più volte che un miglioramento qui NON garantisce un miglioramento `
  report += `nella costruzione reale delle sestine (test difficile) — a volte lo ribalta. `
  report += `**Ogni candidato qui sotto va verificato end-to-end in una sessione dedicata prima di essere adottato, mai applicato automaticamente.**\n\n`

  if (candidatiPromettenti.length === 0) {
    report += `## Nessun candidato promettente trovato in questo ciclo\n\n`
    report += `Nessuna variante testata ha mostrato un miglioramento statisticamente significativo `
    report += `(|z| > ${SIGNIFICATIVITA_MIN}) in almeno 4 posizioni su 6 senza peggiorare nessuna. `
    report += `I parametri attuali restano i migliori conosciuti su questo dataset.\n\n`
  } else {
    report += `## ${candidatiPromettenti.length} candidato/i promettente/i trovato/i — DA VERIFICARE, non adottare direttamente\n\n`
    for (const c of candidatiPromettenti) {
      report += `### ${c.nomeParam} = ${c.valore} (attuale: ${PROD[c.nomeParam]})\n\n`
      report += `Migliora in ${c.posizioniMigliorate}/6 posizioni.\n\n`
      report += `| Posizione | Top10 attuale | Top10 variante | z-score |\n|---|---|---|---|\n`
      for (const r of c.righe) {
        report += `| P${r.posizione} | ${r.top10Base.toFixed(1)}% | ${r.top10Variante.toFixed(1)}% | ${r.z.toFixed(2)} |\n`
      }
      report += `\n`
    }
  }

  report += `\n## Dettaglio completo di tutte le varianti testate in questo ciclo\n\n`
  for (const r of tuttiRisultati) {
    report += `- **${r.nomeParam}=${r.valore}**: migliora in ${r.posizioniMigliorate}/6 posizioni `
    report += `(z per posizione: ${r.righe.map(x => x.z.toFixed(2)).join(', ')})\n`
  }

  fs.writeFileSync(REPORT_PATH, report)
  console.log(`\nReport scritto in ${REPORT_PATH}`)
  console.log(`Candidati promettenti trovati: ${candidatiPromettenti.length}`)
}

main()
