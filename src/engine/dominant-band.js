// Regola "banda dominante": individua per ciascuna posizione la fascia di
// rank (banda) che ha prodotto più numeri nel periodo recente, e decide se
// vale la pena favorirla o evitarla nel generatore, in base al segno
// CONCORDE dell'effetto su due finestre indipendenti (6 mesi + ultima
// settimana). Validata sul rank del motore vero (2874 estrazioni, 15/08/2026):
// P1 e P6 tendono a SEGUIRE la banda dominante, P5 tende a EVITARLA,
// P2/P3/P4 non hanno mostrato un effetto stabile — per questo la regola è
// calcolata posizione per posizione e può restare SPENTA. Vantaggio comunque
// piccolo (2-3 punti percentuali): va trattato come indicatore, non certezza.

import { actualRank } from './scoring'

export const BANDA_WIDTH = 7
export const N_BANDE = 8 // 7 bande larghe BANDA_WIDTH + una banda finale che raccoglie il resto

const FINESTRA_MESI = 100    // ~6 mesi di estrazioni SuperEnalotto
const FINESTRA_SETTIMANA = 15 // ~ultima settimana

// Converte un rank (1-based) nella sua banda (0..N_BANDE-1).
export function bandaDiRank(rank) {
  return Math.min(N_BANDE - 1, Math.floor((rank - 1) / BANDA_WIDTH))
}

// Rank reali walk-forward (mai guardare avanti) delle ultime `n` estrazioni,
// per ciascuna delle 6 posizioni.
function walkForwardRanks(draws, n) {
  const total = draws.length
  const start = Math.max(1, total - n)
  const out = [[], [], [], [], [], []]
  for (let t = start; t < total; t++) {
    const history = draws.slice(0, t)
    for (let p = 0; p < 6; p++) {
      out[p].push(actualRank(history, p, draws[t][2][p]).rank)
    }
  }
  return out
}

function bandaDominante(ranks) {
  const conteggio = new Array(N_BANDE).fill(0)
  for (const r of ranks) conteggio[bandaDiRank(r)]++
  let best = 0
  for (let b = 1; b < N_BANDE; b++) if (conteggio[b] > conteggio[best]) best = b
  return best
}

// Scostamento (in punti percentuali) tra il tasso osservato di caduta nella
// banda indicata e il tasso atteso per caso (100/N_BANDE). Positivo = la
// banda attira più numeri del previsto; negativo = ne attira meno.
function scostamentoBanda(ranks, banda) {
  if (ranks.length === 0) return 0
  const nella = ranks.filter(r => bandaDiRank(r) === banda).length
  return (nella / ranks.length) * 100 - 100 / N_BANDE
}

// Per ciascuna delle 6 posizioni: {stato, banda, v6, vSettPrec}
//  - banda: banda dominante nella finestra dei 6 mesi
//  - v6 / vSettPrec: scostamento (punti %) nella finestra 6 mesi / ultima settimana
//  - stato: 'INCLUDI' se entrambi gli scostamenti sono positivi (segue la banda),
//           'ESCLUDI' se entrambi negativi (la evita),
//           'SPENTA' se discordi — la regola non si attiva
export function statoRegolaPerPosizione(draws) {
  const ranks6m = walkForwardRanks(draws, FINESTRA_MESI)
  const ranksSett = walkForwardRanks(draws, FINESTRA_SETTIMANA)

  return ranks6m.map((serie6m, p) => {
    const banda = bandaDominante(serie6m)
    const v6 = scostamentoBanda(serie6m, banda)
    const vSettPrec = scostamentoBanda(ranksSett[p], banda)

    let stato = 'SPENTA'
    if (v6 > 0 && vSettPrec > 0) stato = 'INCLUDI'
    else if (v6 < 0 && vSettPrec < 0) stato = 'ESCLUDI'

    return {
      stato,
      banda,
      v6: Math.round(v6 * 10) / 10,
      vSettPrec: Math.round(vSettPrec * 10) / 10
    }
  })
}

// Fattore moltiplicativo da applicare al peso di campionamento di un
// candidato nel generatore, in base allo stato della regola per la sua
// posizione (statoPos, elemento del risultato di statoRegolaPerPosizione,
// eventualmente forzato manualmente dall'utente) e alla banda del suo rank.
export function fattorePeso(statoPos, rank) {
  if (!statoPos || statoPos.stato === 'SPENTA') return 1
  const inBanda = bandaDiRank(rank) === statoPos.banda
  if (!inBanda) return 1
  return statoPos.stato === 'INCLUDI' ? 2 : statoPos.stato === 'ESCLUDI' ? 0.5 : 1
}

// Applica gli override MANUALI a una singola sestina già generata, cambiando
// SOLO i numeri delle posizioni forzate e lasciando intatte le altre. Per la
// posizione forzata definisce una BANDA BERSAGLIO:
//   "Favorisci" (INCLUDI) → la banda dominante,
//   "Evita" (ESCLUDI)     → la banda SPECULARE, N_BANDE-1-dominante
//                           (riflessa: 0↔7, 1↔6, 2↔5, 3↔4),
// e sceglie, tra i candidati ammessi dal vincolo d'ordine (strettamente tra i
// due vicini, non già usati nelle altre posizioni), quello col rank PIÙ VICINO
// al centro della banda bersaglio. Un candidato valido esiste sempre (almeno il
// numero attuale, che sta tra i vicini), quindi la posizione ha sempre una
// risposta definita: quando la banda bersaglio non è raggiungibile dentro il
// vincolo (es. P1/Evita, banda profonda ma il numero deve restare < P2),
// "più vicino" diventa il rank più estremo disponibile in quella direzione.
// Deterministico: senza override manuali la sestina resta quella di base.
export function applicaOverride(rankedPerPosizione, sestina, statiEffettivi) {
  const numeri = [...sestina.numeri]
  const dettaglio = sestina.dettaglio.map(d => ({ ...d }))

  for (let p = 0; p < 6; p++) {
    const st = statiEffettivi[p]
    if (!st || !st.manuale || st.stato === 'SPENTA') continue
    const bandaTarget = st.stato === 'INCLUDI' ? st.banda : (N_BANDE - 1 - st.banda)
    const rankTarget = bandaTarget * BANDA_WIDTH + Math.ceil(BANDA_WIDTH / 2) // centro della banda bersaglio
    const low = p > 0 ? numeri[p - 1] : 0
    const high = p < 5 ? numeri[p + 1] : 91
    const full = rankedPerPosizione[p] // [ [num, score], ... ] ordinati per rank

    let best = null // { num, score, rank, dist }
    for (let idx = 0; idx < full.length; idx++) {
      const [num, score] = full[idx]
      if (num <= low || num >= high) continue // rispetta l'ordine crescente
      let usataAltrove = false
      for (let q = 0; q < 6; q++) { if (q !== p && numeri[q] === num) { usataAltrove = true; break } }
      if (usataAltrove) continue
      const rank = idx + 1
      const dist = Math.abs(rank - rankTarget)
      if (!best || dist < best.dist || (dist === best.dist && rank < best.rank)) {
        best = { num, score, rank, dist }
      }
    }

    if (best) {
      numeri[p] = best.num
      dettaglio[p] = { ...dettaglio[p], numero: best.num, punteggio: best.score, rank: best.rank, poolSize: full.length }
    }
  }

  const punteggioTotale = dettaglio.reduce((s, d) => s + d.punteggio, 0)
  const rankMedio = dettaglio.reduce((s, d) => s + d.rank, 0) / dettaglio.length
  return { ...sestina, numeri, dettaglio, punteggioTotale, rankMedio }
}
