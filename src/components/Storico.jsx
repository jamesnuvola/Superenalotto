import { useMemo, useState } from 'react'
import { v, P, styles, ballStyle, MONO } from '../utils/theme'
import rankHistory from '../data/rank-history.json'

const PER_PAGE = 20

function buildRankIndex() {
  const idx = new Map()
  for (const e of rankHistory) idx.set(`${e.data}_${e.concorso}`, e)
  return idx
}

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
  const rankIndex = useMemo(buildRankIndex, [])
  const [page, setPage] = useState(0)
  const ordered = useMemo(() => [...draws].reverse(), [draws])
  const totalPages = Math.max(1, Math.ceil(ordered.length / PER_PAGE))
  const start = page * PER_PAGE
  const items = ordered.slice(start, start + PER_PAGE)

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Storico completo — {draws.length} estrazioni</h2>
        <p style={styles.caption}>
          Tutte le estrazioni reali, dalla più recente. Il rank (posizione nella classifica dei
          candidati, walk-forward) è disponibile per le estrazioni già registrate; per lo storico più
          lontano mostriamo solo i numeri.
        </p>

        <Pager page={page} totalPages={totalPages} setPage={setPage} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((draw, i) => {
            const e = rankIndex.get(`${draw[0]}_${draw[1]}`)
            return (
              <div key={start + i} style={{ ...styles.card, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: MONO, color: v.muted, fontSize: 12, minWidth: 82 }}>{draw[0]}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {draw[2].map((num, j) => (
                    <div key={j} style={{ textAlign: 'center' }}>
                      <span style={ballStyle(P[j % 6], 30, 12)}>{num}</span>
                      {e && <div style={{ fontSize: 9, color: v.muted, fontFamily: MONO }}>#{e.ranks[j]}</div>}
                    </div>
                  ))}
                </div>
                <span style={{ fontFamily: MONO, color: v.gold, fontSize: 12 }}>J {draw[3]}</span>
                {e
                  ? <span style={{ fontSize: 11, color: v.dim, fontFamily: MONO }}>rm {e.rankMedio.toFixed(1)}</span>
                  : <span style={{ fontSize: 11, color: v.dim, fontStyle: 'italic' }}>rank n/d</span>}
              </div>
            )
          })}
        </div>

        <Pager page={page} totalPages={totalPages} setPage={setPage} />
      </section>
    </div>
  )
}
