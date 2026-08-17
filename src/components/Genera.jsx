import { useMemo, useState } from 'react'
import { v, P, styles, ballStyle, MONO } from '../utils/constants'
import { generateTopSestine, HISTORICAL_AVG_RANK, RANK_BANDS_BY_POSITION } from '../engine/multigen'
import { actualRank, rankedCandidates, POSITION_LABELS } from '../engine/scoring'
import { statoRegolaPerPosizione, applicaOverride } from '../engine/dominant-band'
import PosizioniChart, { historicalSeries, stimaProssimaData } from './PosizioniChart'
import { buildProjection } from './proiezione'

const RECENT_LOOKBACK = 10
const STATI_FORZABILI = ['AUTO', 'INCLUDI', 'ESCLUDI', 'SPENTA']

function computeRecentWithRank(draws) {
  const n = draws.length
  const startIdx = Math.max(1, n - RECENT_LOOKBACK)
  const out = []
  for (let t = n - 1; t >= startIdx; t--) {
    const history = draws.slice(0, t)
    const ranks = draws[t][2].map((num, p) => actualRank(history, p, num).rank)
    const rankMedio = ranks.reduce((s, r) => s + r, 0) / ranks.length
    out.push({ draw: draws[t], ranks, rankMedio })
  }
  return out
}

const statoColor = { INCLUDI: v.green, ESCLUDI: v.hot, SPENTA: v.muted }

export default function Genera({ draws }) {
  const statiAuto = useMemo(() => statoRegolaPerPosizione(draws), [draws])
  const [override, setOverride] = useState({})
  const [selectedIdx, setSelectedIdx] = useState(0)

  // Stato RISOLTO per posizione: se hai forzato a mano usa quello, altrimenti
  // la direzione rilevata dai dati (Auto). È lo stesso oggetto per tutti gli
  // stati — Auto non è un caso a parte, sceglie solo quale dei tre applicare.
  const statiRisolti = useMemo(
    () => statiAuto.map((s, p) => {
      const ov = override[p]
      return ov && ov !== 'AUTO' ? { ...s, stato: ov } : s
    }),
    [statiAuto, override]
  )

  // Base NEUTRA: solo punteggio, nessun effetto banda. Da qui applicaOverride
  // sostituisce i numeri secondo lo stato risolto (Spenta = resta il neutro).
  const rankedPerPos = useMemo(() => [0, 1, 2, 3, 4, 5].map(p => rankedCandidates(draws, p)), [draws])
  const topBase = useMemo(() => generateTopSestine(draws, 10), [draws])
  const topSestine = useMemo(
    () => topBase.map(s => applicaOverride(rankedPerPos, s, statiRisolti)),
    [topBase, rankedPerPos, statiRisolti]
  )
  const recent = useMemo(() => computeRecentWithRank(draws), [draws])
  const sel = topSestine[Math.min(selectedIdx, topSestine.length - 1)]
  const best = topSestine[0]

  // Grafico proiezione: 15 estrazioni reali + la sestina selezionata nella colonna futura
  const hs = useMemo(() => historicalSeries(draws, 15), [draws])
  const futureLabel = useMemo(() => stimaProssimaData(draws), [draws])
  const proj = useMemo(() => {
    const nums = sel ? sel.numeri : new Array(6).fill(null)
    const ranks = sel ? sel.dettaglio.map(d => d.rank) : new Array(6).fill(null)
    return buildProjection(hs, futureLabel, nums, ranks)
  }, [hs, futureLabel, sel])

  return (
    <div>
      {/* Grafico proiezione, compatto e bloccato in cima */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: v.bg, paddingBottom: 8, marginBottom: 14, borderBottom: `1px solid ${v.border}` }}>
        <div style={{ fontSize: 12, color: v.muted, margin: '0 0 6px' }}>
          Proiezione sestina #{selectedIdx + 1} alla prossima estrazione ({futureLabel}) — seleziona una sestina sotto per aggiornarla
        </div>
        <PosizioniChart columns={proj.columns} lines={proj.lines} jolly={proj.jolly} height={200} legend={false} />
      </div>

      {/* Regola banda dominante */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Regola banda dominante</h2>
        <p style={styles.caption}>
          Per ogni posizione, la fascia di rank che ultimamente ha prodotto più numeri del previsto.
          Ci sono tre proposte per posizione: "Off" = numero neutro (solo punteggio, nessuna banda),
          "Favorisci" = verso la banda dominante, "Evita" = verso la banda speculare (riflessa: 0↔7,
          1↔6, 2↔5, 3↔4). "Auto" non è una quarta proposta: applica Favorisci o Evita secondo i dati,
          o resta neutro se il segnale è nullo. Cambia solo il numero di quella posizione. Indicatore, non certezza.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {POSITION_LABELS.map((label, p) => {
            const s = statiRisolti[p]
            const cur = override[p] || 'AUTO'
            const etichettaStato = s.stato === 'INCLUDI' ? 'dominante' : s.stato === 'ESCLUDI' ? 'speculare' : 'neutro'
            return (
              <div key={label} style={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <strong style={{ fontFamily: MONO, color: v.text }}>{label}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statoColor[s.stato] }}>
                    {cur === 'AUTO' ? `Auto → ${etichettaStato}` : etichettaStato}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: v.muted, marginBottom: 8 }}>
                  banda {s.banda} · 6m {s.v6 > 0 ? '+' : ''}{s.v6}% · sett {s.vSettPrec > 0 ? '+' : ''}{s.vSettPrec}%
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {STATI_FORZABILI.map(st => {
                    const on = cur === st
                    return (
                      <button
                        key={st}
                        onClick={() => setOverride(o => ({ ...o, [p]: st }))}
                        style={{
                          flex: 1, fontSize: 10, padding: '4px 2px', borderRadius: 5,
                          border: `1px solid ${on ? v.accent : v.borderHi}`,
                          background: on ? v.accent : 'transparent',
                          color: on ? v.bg : v.text, cursor: 'pointer', fontFamily: 'inherit'
                        }}
                      >
                        {st === 'AUTO' ? 'Auto' : st === 'INCLUDI' ? 'Favorisci' : st === 'ESCLUDI' ? 'Evita' : 'Off'}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Sestine consigliate */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Sestine consigliate</h2>
        <p style={styles.caption}>
          Generate dal motore validato su {draws.length} estrazioni reali, escludendo ogni combinazione
          già uscita (intera o 5 su 6). Ordinate per punteggio totale. Gioco statistico, non previsione.
        </p>

        {best && (
          <div
            onClick={() => setSelectedIdx(0)}
            style={{ ...styles.card, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'space-between', cursor: 'pointer', outline: selectedIdx === 0 ? `2px solid ${v.accent}` : 'none' }}
          >
            {best.numeri.map((num, i) => {
              const d = best.dettaglio[i]
              const band = RANK_BANDS_BY_POSITION[i]
              const q = d.rank <= band.p25 ? `top (${band.p25}-${band.p75})` : d.rank <= band.p75 ? `norma (${band.p25}-${band.p75})` : `sotto (${band.p25}-${band.p75})`
              return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ ...ballStyle(P[i % 6], 44, 17), margin: '0 auto' }}>{num}</span>
                  <div style={{ fontSize: 10, color: v.muted, marginTop: 4, fontFamily: MONO }}>P{i + 1} · r{d.rank}/{d.poolSize}</div>
                  <div style={{ fontSize: 9, color: v.dim }}>{q}</div>
                </div>
              )
            })}
          </div>
        )}
        <p style={{ fontSize: 11, color: v.muted, margin: '8px 0 4px' }}>
          ↑ La migliore (punteggio {best?.punteggioTotale.toFixed(2)}) · rank medio {best?.rankMedio.toFixed(2)}
        </p>
        <p style={{ fontSize: 11, color: v.dim, margin: '0 0 12px', lineHeight: 1.5 }}>
          Filtrate entro la fascia di rank medio reale ({HISTORICAL_AVG_RANK.p10}–{HISTORICAL_AVG_RANK.p90}):
          scartiamo i profili troppo ottimistici, mai visti in 2.874 estrazioni.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {topSestine.slice(1).map((s, i) => {
            const idx = i + 1
            return (
              <div
                key={i}
                onClick={() => setSelectedIdx(idx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: v.surface, border: `1px solid ${selectedIdx === idx ? v.accent : v.border}`
                }}
              >
                <span style={{ fontFamily: MONO, color: v.muted, fontSize: 11, minWidth: 22 }}>#{idx + 1}</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                  {s.numeri.map((num, j) => (
                    <span key={j} style={ballStyle(P[j % 6], 26, 11)}>{num}</span>
                  ))}
                </div>
                <span style={{ fontFamily: MONO, color: v.accent, fontSize: 12 }}>{s.punteggioTotale.toFixed(2)}</span>
              </div>
            )
          })}
        </div>

      </section>

      {/* Ultime estrazioni */}
      <section style={styles.section}>
        <h2 style={styles.h2}>Ultime estrazioni</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map((item, idx) => (
            <div key={idx} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, color: v.muted, fontSize: 12, minWidth: 82 }}>{item.draw[0]}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {item.draw[2].map((num, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <span style={ballStyle(P[i % 6], 30, 12)}>{num}</span>
                    <div style={{ fontSize: 9, color: v.muted, fontFamily: MONO }}>#{item.ranks[i]}</div>
                  </div>
                ))}
              </div>
              <span style={{ fontFamily: MONO, color: v.gold, fontSize: 12 }}>J {item.draw[3]}</span>
              <span style={{ fontSize: 11, color: v.dim, fontFamily: MONO }}>rm {item.rankMedio.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
