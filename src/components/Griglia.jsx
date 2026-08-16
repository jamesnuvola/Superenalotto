import { useMemo, useState } from 'react'
import { v, styles, MONO } from '../utils/theme'
import { rankedCandidates, POSITION_LABELS } from '../engine/scoring'
import { utils } from '../utils/constants'

function parseDataIT(s) { const [g, m, a] = s.split('/').map(Number); return { mese: m, anno: a } }

function buildGrid(draws) {
  const grid = {}
  for (let n = 1; n <= 90; n++) grid[n] = new Array(6).fill(null)
  for (let p = 0; p < 6; p++) rankedCandidates(draws, p).forEach(([num], idx) => { grid[num][p] = idx + 1 })
  return grid
}
function rankBg(rank) {
  if (rank === null) return 'transparent'
  if (rank <= 10) return 'rgba(0,212,255,0.35)'
  if (rank <= 20) return 'rgba(0,212,255,0.18)'
  if (rank <= 40) return 'rgba(0,212,255,0.08)'
  return 'rgba(255,255,255,0.02)'
}
function freqPeriodo(draws, filtro) {
  const f = {}
  for (const d of draws) { const { mese, anno } = parseDataIT(d[0]); if (!filtro(mese, anno)) continue; for (const n of d[2]) f[n] = (f[n] || 0) + 1 }
  return f
}

export default function Griglia({ draws }) {
  const grid = useMemo(() => buildGrid(draws), [draws])
  const [sortPos, setSortPos] = useState(null)
  const lastDraw = draws[draws.length - 1]

  const stats = useMemo(() => {
    const now = new Date(), m = now.getMonth() + 1, a = now.getFullYear()
    const atteso = (draws.length * 6) / 90
    return {
      top: utils.getTopNumbers(draws, 10),
      bottom: utils.getBottomNumbers(draws, 10),
      mese: freqPeriodo(draws, (mm, aa) => mm === m && aa === a),
      anno: freqPeriodo(draws, (mm, aa) => aa === a),
      atteso, m, a
    }
  }, [draws])

  const numbers = useMemo(() => {
    const nums = Array.from({ length: 90 }, (_, i) => i + 1)
    if (sortPos === null) return nums
    return nums.slice().sort((x, y) => (grid[x][sortPos] ?? 999) - (grid[y][sortPos] ?? 999))
  }, [grid, sortPos])

  const th = (active) => ({ padding: '6px 4px', fontSize: 11, color: active ? v.accent : v.muted, cursor: 'pointer', fontFamily: MONO, borderBottom: `1px solid ${v.border}` })
  const usciteMese = Object.entries(stats.mese).sort((a, b) => b[1] - a[1])
  const usciteAnno = Object.entries(stats.anno).sort((a, b) => b[1] - a[1])

  const NumList = ({ title, rows, color }) => (
    <div style={{ flex: '1 1 240px' }}>
      <h2 style={styles.h2}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {rows.length === 0 && <span style={styles.caption}>Nessun dato.</span>}
        {rows.map(([num, count], idx) => (
          <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ fontFamily: MONO, color: v.muted, minWidth: 20 }}>{idx + 1}</span>
            <span style={{ fontFamily: MONO, color: color || v.text, fontWeight: 700, minWidth: 24 }}>{num}</span>
            <span style={{ color: v.muted, fontSize: 12 }}>{count} uscite (atteso {stats.atteso.toFixed(1)})</span>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Panoramica</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['Estrazioni', draws.length], ['Attesa/numero', stats.atteso.toFixed(1)], ['Usciti nel mese', Object.keys(stats.mese).length], ['Nel mese ' + stats.m + '/' + stats.a, usciteMese.length]].map(([l, val]) => (
            <div key={l} style={{ ...styles.card, flex: '1 1 130px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: v.muted }}>{l}</div>
              <div style={{ fontSize: 22, color: v.accent, fontFamily: MONO }}>{val}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...styles.section, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <NumList title={`Usciti nel mese ${stats.m}/${stats.a}`} rows={usciteMese.slice(0, 12)} color={v.warm} />
        <NumList title={`Totale anno ${stats.a}`} rows={usciteAnno.slice(0, 12)} color={v.green} />
      </section>

      <section style={{ ...styles.section, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <NumList title="Più frequenti (storico)" rows={stats.top.map(t => [t.num, t.count])} color={v.hot} />
        <NumList title="Meno frequenti (storico)" rows={stats.bottom.map(t => [t.num, t.count])} color={v.cold} />
      </section>

      <section style={styles.section}>
        <h2 style={styles.h2}>Rank di tutti i 90 numeri per posizione</h2>
        <p style={styles.caption}>
          Aggiornato al {lastDraw ? lastDraw[0] : '-'}. Tocca una posizione per ordinare. Cella vuota =
          numero mai candidato osservato in quella posizione.
        </p>
        <div style={{ overflowX: 'auto', ...styles.card, padding: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: MONO }}>
            <thead>
              <tr>
                <th style={th(sortPos === null)} onClick={() => setSortPos(null)}>N.</th>
                {POSITION_LABELS.map((l, p) => (
                  <th key={p} style={th(sortPos === p)} onClick={() => setSortPos(p)}>{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {numbers.map(n => (
                <tr key={n}>
                  <td style={{ padding: '4px 6px', color: v.text, textAlign: 'center', fontWeight: 700 }}>{n}</td>
                  {grid[n].map((rank, p) => (
                    <td key={p} style={{ padding: '4px 6px', textAlign: 'center', color: v.text, background: rankBg(rank) }}>{rank ?? '–'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
