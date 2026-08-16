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
