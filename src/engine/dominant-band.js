// ============================================================================
// REGOLA "BANDA DOMINANTE" — attivazione automatica per posizione
// ============================================================================
// La banda dominante è la fascia di rank (griglia a 8 livelli) che ha prodotto
// più numeri in un periodo. La regola, per ogni posizione, può:
//   - INCLUDERE la dominante (spinge i pesi verso quella banda)
//   - ESCLUDERE la dominante (spinge i pesi via da quella banda)
//   - essere SPENTA (nessuna modifica ai pesi)
//
// Lo stato è deciso AUTOMATICAMENTE dal segno del "vantaggio storico" del
// seguire la dominante, calcolato su DUE finestre — 6 mesi e settimana
// precedente — che devono CONCORDARE:
//   entrambi + → INCLUDI    entrambi − → ESCLUDI    discordi → SPENTA
//
// Nota di onestà (documentata in SONAR_Regole.md Rev.3): i vantaggi misurati
// sono piccoli (2-3%) e non tutte le posizioni reggono lo split temporale.
// La regola è un indicatore configurabile, non una previsione garantita.
// ============================================================================

const N_BANDE = 8;
const BANDA_WIDTH = Math.ceil(48 / (N_BANDE - 1)); // 7: livelli 0..6 coprono rank 1..48, livello 7 = 49+

// A quale banda (0..7) appartiene un rank
export function bandaDiRank(rank) {
  if (rank >= 99) return N_BANDE - 1;
  return Math.min(Math.floor((rank - 1) / BANDA_WIDTH), N_BANDE - 1);
}

// Banda dominante in una finestra di rank-history [fromIdx, toIdx) per una posizione.
// rankHist = array di { ranks: [6] } in ordine cronologico crescente.
function bandaDominante(rankHist, position, fromIdx, toIdx) {
  const conteggio = new Array(N_BANDE).fill(0);
  for (let i = Math.max(0, fromIdx); i < toIdx; i++) {
    conteggio[bandaDiRank(rankHist[i].ranks[position])]++;
  }
  let best = 0;
  for (let b = 1; b < N_BANDE; b++) if (conteggio[b] > conteggio[best]) best = b;
  return best;
}

// Peso globale di ogni banda per posizione (la frazione di volte in cui il
// numero uscito cade in quella banda, su tutto lo storico). È il livello
// "atteso": serve per capire se seguire la dominante dà vantaggio o no.
function pesiGlobali(rankHist, position) {
  const c = new Array(N_BANDE).fill(0);
  for (const r of rankHist) c[bandaDiRank(r.ranks[position])]++;
  return c.map((x) => x / rankHist.length);
}

// Vantaggio del "seguire la banda dominante domBanda" su un blocco [from,to):
// (frazione reale con cui il numero uscito cade in domBanda) − (atteso).
// >0 → seguirla conviene; <0 → conviene evitarla.
function vantaggio(rankHist, position, domBanda, pesoGlob, fromIdx, toIdx) {
  let cade = 0, casi = 0, atteso = 0;
  for (let i = Math.max(0, fromIdx); i < toIdx; i++) {
    casi++;
    if (bandaDiRank(rankHist[i].ranks[position]) === domBanda) cade++;
    atteso += pesoGlob[domBanda];
  }
  if (casi === 0) return 0;
  return (cade - atteso) / casi;
}

// Numero di estrazioni che approssimano le due finestre
const ESTR_6MESI = 100; // ~6 mesi (4 estrazioni/settimana × ~26 settimane)
const ESTR_SETT = 4;    // una settimana

// Stato della regola per ogni posizione, deciso dal segno concorde di
// 6 mesi + settimana precedente. Ritorna, per ciascuna delle 6 posizioni:
//   { stato: 'INCLUDI'|'ESCLUDI'|'SPENTA', banda: <0..7>, v6: <num>, vSettPrec: <num> }
// dove `banda` è la banda dominante recente (dei 6 mesi), quella su cui agire.
export function statoRegolaPerPosizione(rankHist) {
  const n = rankHist.length;
  const stati = [];
  for (let p = 0; p < 6; p++) {
    // dati insufficienti → spenta
    if (n < ESTR_6MESI + ESTR_SETT) {
      stati.push({ stato: 'SPENTA', banda: null, v6: 0, vSettPrec: 0 });
      continue;
    }
    const pesoGlob = pesiGlobali(rankHist, p);
    // banda dominante calcolata sui 6 mesi (è quella che la regola usa)
    const domBanda = bandaDominante(rankHist, p, n - ESTR_6MESI, n);
    // segno del vantaggio sui 6 mesi e sulla settimana precedente (le ultime
    // ESTR_SETT estrazioni sono la "settimana in corso"; quella prima è la
    // "settimana precedente": [n-2*SETT, n-SETT))
    const v6 = vantaggio(rankHist, p, domBanda, pesoGlob, n - ESTR_6MESI, n);
    const vSettPrec = vantaggio(rankHist, p, domBanda, pesoGlob, n - 2 * ESTR_SETT, n - ESTR_SETT);
    const s6 = Math.sign(v6);
    const sPrec = Math.sign(vSettPrec);

    let stato;
    if (s6 !== 0 && s6 === sPrec) stato = s6 > 0 ? 'INCLUDI' : 'ESCLUDI';
    else stato = 'SPENTA';

    stati.push({ stato, banda: domBanda, v6, vSettPrec });
  }
  return stati;
}

// Fattore moltiplicativo da applicare al peso di un candidato, data la sua
// banda di rank e lo stato della regola per la sua posizione.
//   INCLUDI: i numeri nella banda dominante pesano di più (×BOOST)
//   ESCLUDI: i numeri nella banda dominante pesano di meno (×1/BOOST)
//   SPENTA:  nessuna modifica (×1)
const BOOST = 2.0;
export function fattorePeso(statoPos, rankCandidato) {
  if (!statoPos || statoPos.stato === 'SPENTA' || statoPos.banda == null) return 1;
  const inBanda = bandaDiRank(rankCandidato) === statoPos.banda;
  if (!inBanda) return 1;
  return statoPos.stato === 'INCLUDI' ? BOOST : 1 / BOOST;
}
