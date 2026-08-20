import { useMemo, useState } from 'react'
import { v, P, styles, ballStyle, MONO } from '../utils/constants'
import { actualRank } from '../engine/scoring'

const PER_PAGE = 20

function Pager({ page, totalPages, setPage }) {
  const btn = (dis) => ({
    background: v.card, border: `1px solid ${v.borderHi}`, color: v.text,
    padding: '8px 14px', borderRadius: 8, cursor: dis ? 'default' : 'pointer',
    fontSize: 13, opacity: dis ? 0.35 : 1, fontFamily: 'inherit'
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, margin: '16px 0' }}>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={btn(page === 0)}>← Più recenti</button>
      <span style={{ color: v.muted, fontSize: 13, fontFamily: MONO }}>{page + 1} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={btn(page >= totalPages - 1)}>Meno recenti →</button>
    </div>
  )
}

export default function Storico({ draws }) {
  const [page, setPage] = useState(0)
  const N = draws.length
  const totalPages = Math.max(1, Math.ceil(N / PER_PAGE))
  const start = page * PER_PAGE

  // Rank walk-forward calcolato AL VOLO per le sole righe mostrate: per ogni
  // estrazione, il rank del numero uscito in ogni posizione secondo lo storico
  // PRECEDENTE (com'era prima che uscisse). 20 righe × 6 = costo trascurabile.
  const rows = useMemo(() => {
    const out = []
    const hi = N - 1 - start
    const lo = Math.max(0, hi - PER_PAGE + 1)
    for (let i = hi; i >= lo; i--) {
      const draw = draws[i]
      const history = draws.slice(0, i)
      let ranks = null, rankMedio = null
      if (history.length >= 1) {
        ranks = draw[2].map((num, p) => actualRank(history, p, num).rank)
        rankMedio = ranks.reduce((a, b) => a + b, 0) / 6
      }
      out.push({ draw, ranks, rankMedio })
    }
    return out
  }, [draws, page])

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Storico completo — {N} estrazioni</h2>
        <p style={styles.caption}>
          Tutte le estrazioni reali, dalla più recente. Sotto ogni numero il suo rank: la posizione che
          quel numero aveva nella classifica dei candidati per quella posizione, calcolata sullo storico
          precedente — cioè quanto era atteso prima che uscisse (1 = il più atteso).
        </p>

        <Pager page={page} totalPages={totalPages} setPage={setPage} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(({ draw, ranks, rankMedio }, i) => (
            <div key={start + i} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, color: v.muted, fontSize: 12, minWidth: 82 }}>{draw[0]}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {draw[2].map((num, j) => (
                  <div key={j} style={{ textAlign: 'center' }}>
                    <span style={ballStyle(P[j % 6], 30, 12)}>{num}</span>
                    {ranks && <div style={{ fontSize: 9, color: v.muted, fontFamily: MONO }}>#{ranks[j]}</div>}
                  </div>
                ))}
              </div>
              <span style={{ fontFamily: MONO, color: v.gold, fontSize: 12 }}>J {draw[3]}</span>
              {rankMedio != null
                ? <span style={{ fontSize: 11, color: v.dim, fontFamily: MONO }}>rm {rankMedio.toFixed(1)}</span>
                : <span style={{ fontSize: 11, color: v.dim, fontStyle: 'italic' }}>prima estrazione</span>}
            </div>
          ))}
        </div>

        <Pager page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </div>
  )
}
