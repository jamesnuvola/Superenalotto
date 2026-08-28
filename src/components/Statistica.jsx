import { useState } from 'react'
import { v, styles, MONO } from '../utils/constants'
import { hotScores, delayScores, decadeScores, clusterScores, volatilityScores, coldHScores, POSITION_LABELS } from '../engine/scoring'
import { statoRegolaPerPosizione, fattorePeso } from '../engine/dominant-band'
import { decidiFiltroEstremi } from '../engine/multigen'

// ---------- motore di backtest (walk-forward) ----------
function nCk(n, k) { if (k < 0 || k > n) return 0; k = Math.min(k, n - k); let r = 1; for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1); return r }
const ordScore = (p, val) => nCk(val - 1, p) * nCk(90 - val, 5 - p)
function normMax(map) { let mx = 1e-9; for (const v of map.values()) if (v > mx) mx = v; const o = new Map(); for (const [k, v] of map) o.set(k, v / mx); return o }
const RULE_FN = { decade: decadeScores, hot: hotScores, cluster: clusterScores, vol: volatilityScores, delay: delayScores, cold: coldHScores }
const RULE_LABEL = { decade: 'DECADE', hot: 'HOT_V', cluster: 'CLUSTER', vol: 'VERTVOL', delay: 'DELAY_V', cold: 'COLD_H' }

function customComposite(h, p, rules) {
  const active = Object.keys(RULE_FN).filter(k => rules[k])
  if (active.length === 0) return new Map()
  const maps = active.map(k => normMax(RULE_FN[k](h, p)))
  const all = new Set(); maps.forEach(m => { for (const k of m.keys()) all.add(k) })
  const out = new Map()
  for (const n of all) { let s = 0; for (const m of maps) s += m.get(n) || 0; out.set(n, s) }
  return out
}

function scoreMap(h, p, set, bandaStato) {
  let base
  if (set.base === 'ordstat') { base = new Map(); for (let v = 1; v <= 90; v++) base.set(v, ordScore(p, v)) }
  else {
    const comp = customComposite(h, p, set.rules)
    if (set.base === 'composito') base = comp
    else {
      const cn = normMax(comp); let omx = 1e-9; for (let v = 1; v <= 90; v++) omx = Math.max(omx, ordScore(p, v))
      base = new Map(); for (let v = 1; v <= 90; v++) base.set(v, (1 - set.alpha) * (cn.get(v) || 0) + set.alpha * (ordScore(p, v) / omx))
    }
  }
  if (set.banda && bandaStato) {
    const ranked = [...base.entries()].sort((a, b) => b[1] - a[1])
    const w = new Map(); ranked.forEach(([num], i) => w.set(num, base.get(num) * fattorePeso(bandaStato[p], i + 1)))
    base = w
  }
  return base
}

const ymOf = d => { const [g, m, a] = d[0].split('/').map(Number); return a * 100 + m }

function backtest(draws, set, fromYM, toYM) {
  const hit1 = [0, 0, 0, 0, 0, 0], hit3 = [0, 0, 0, 0, 0, 0]; let n = 0
  const filtroPieno = set.filtro && set.filtro.attivo ? { ...set.filtro, tipicoP1: 13.4, tipicoP6: 78.3 } : null
  for (let t = 1; t < draws.length; t++) {
    const y = ymOf(draws[t]); if (y < fromYM || y > toYM) continue
    const h = draws.slice(0, t)
    const banda = set.banda ? statoRegolaPerPosizione(h) : null
    const dec = filtroPieno ? decidiFiltroEstremi(h, filtroPieno) : { vincoloP1: false, vincoloP6: false }
    const real = draws[t][2]
    for (let p = 0; p < 6; p++) {
      let entries = [...scoreMap(h, p, set, banda).entries()]
      if (p === 0 && dec.vincoloP1) entries = entries.filter(([num]) => num <= filtroPieno.tettoP1)
      if (p === 5 && dec.vincoloP6) entries = entries.filter(([num]) => num >= filtroPieno.pavimentoP6)
      const t3 = entries.sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0])
      if (t3[0] === real[p]) hit1[p]++
      if (t3.includes(real[p])) hit3[p]++
    }
    n++
  }
  return { hit1, hit3, n }
}
const somma = a => a.reduce((x, y) => x + y, 0)

// ---------- UI ----------
const parseM = s => { if (!s) return null; const [a, m] = s.split('-').map(Number); return a * 100 + m }

function Toggle({ on, set, label, color = v.accent }) {
  return (
    <button onClick={() => set(!on)} style={{
      padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: MONO, fontSize: 11,
      border: `1px solid ${on ? color : v.borderHi}`, background: on ? color : 'transparent', color: on ? v.bg : v.text
    }}>{label}</button>
  )
}

export default function Statistica({ draws }) {
  const [trainFrom, setTrainFrom] = useState('2026-03')
  const [trainTo, setTrainTo] = useState('2026-06')
  const [testFrom, setTestFrom] = useState('2026-07')
  const [testTo, setTestTo] = useState('2026-08')
  const [base, setBase] = useState('composito') // composito | ordstat | miscela
  const [alpha, setAlpha] = useState(0.75)
  const [rules, setRules] = useState({ decade: true, hot: true, cluster: true, vol: true, delay: true, cold: true })
  const [banda, setBanda] = useState(false)
  const [filtro, setFiltro] = useState({ attivo: false, tettoP1: 16, pavimentoP6: 76 })
  const [res, setRes] = useState(null)
  const [computing, setComputing] = useState(false)
  const [salvato, setSalvato] = useState(false)

  const setting = { base, alpha, rules, banda, filtro }

  const calcola = () => {
    setComputing(true); setSalvato(false); setRes(null)
    setTimeout(() => {
      const tf = parseM(trainFrom), tt = parseM(trainTo), ef = parseM(testFrom), et = parseM(testTo)
      const ordSet = { base: 'ordstat', alpha: 1, rules: {}, banda: false, filtro: { attivo: false } }
      const trainS = backtest(draws, setting, tf, tt), trainO = backtest(draws, ordSet, tf, tt)
      const testS = backtest(draws, setting, ef, et), testO = backtest(draws, ordSet, ef, et)
      setRes({ trainS, trainO, testS, testO })
      setComputing(false)
    }, 30)
  }

  const salva = () => {
    try { localStorage.setItem('sonar_setting', JSON.stringify(setting)); setSalvato(true) } catch (e) { setSalvato(false) }
  }

  const testBatte = res && somma(res.testS.hit3) >= somma(res.testO.hit3)

  const renderPeriodo = (nome, s, o, esame) => {
    const dS3 = somma(s.hit3), dO3 = somma(o.hit3), dS1 = somma(s.hit1), dO1 = somma(o.hit1)
    const diff = dS3 - dO3
    return (
      <div style={{ ...styles.card, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <strong style={{ fontFamily: MONO, color: esame ? v.accent : v.text }}>{nome}</strong>
          <span style={{ fontSize: 11, color: v.muted, fontFamily: MONO }}>{s.n} estrazioni</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: MONO }}>
            <thead><tr>
              <th style={{ textAlign: 'left', color: v.muted, padding: '3px 4px' }}>hit@3</th>
              {POSITION_LABELS.map(l => <th key={l} style={{ color: v.muted, padding: '3px 4px' }}>{l}</th>)}
              <th style={{ color: v.muted, padding: '3px 4px' }}>tot</th>
            </tr></thead>
            <tbody>
              <tr>
                <td style={{ color: v.text, padding: '3px 4px' }}>settaggio</td>
                {s.hit3.map((x, i) => <td key={i} style={{ textAlign: 'center', color: v.text, padding: '3px 4px' }}>{x}</td>)}
                <td style={{ textAlign: 'center', color: v.accent, fontWeight: 700, padding: '3px 4px' }}>{dS3}</td>
              </tr>
              <tr>
                <td style={{ color: v.muted, padding: '3px 4px' }}>ordstat</td>
                {o.hit3.map((x, i) => <td key={i} style={{ textAlign: 'center', color: v.muted, padding: '3px 4px' }}>{x}</td>)}
                <td style={{ textAlign: 'center', color: v.muted, fontWeight: 700, padding: '3px 4px' }}>{dO3}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11, marginTop: 6, fontFamily: MONO, color: diff > 0 ? v.green : diff < 0 ? v.hot : v.muted }}>
          hit@3 settaggio {dS3} vs ordstat {dO3} → {diff > 0 ? '+' : ''}{diff}
          {esame && <strong>{diff >= 0 ? '  ✓ regge sul futuro' : '  ✗ perde sul futuro (rumore)'}</strong>}
          <span style={{ color: v.dim }}>  ·  hit@1: {dS1} vs {dO1}</span>
        </div>
      </div>
    )
  }

  return (
    <div>
      <section style={styles.section}>
        <h2 style={styles.h2}>Statistica — laboratorio di backtest</h2>
        <p style={styles.caption}>
          Provi un settaggio su un periodo di <strong style={{ color: v.text }}>taratura</strong> e lo esamini su un periodo
          <strong style={{ color: v.text }}> successivo</strong> che non ha visto. Conta solo l'esame: se un settaggio va forte in taratura
          ma perde all'esame, era fortuna (rumore). Se regge all'esame, è vero — e lo salvi. Metrica: hit@1 e hit@3 per posizione,
          walk-forward, contro la statistica d'ordine come riferimento.
        </p>

        {/* periodi */}
        <div style={{ ...styles.card, marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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
        </div>

        {/* ranking base */}
        <div style={{ ...styles.card, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: v.muted, fontFamily: MONO, marginBottom: 6 }}>Ranking base</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: base === 'miscela' ? 10 : 0 }}>
            {[['composito', 'Composito'], ['ordstat', "Statistica d'ordine"], ['miscela', 'Miscela']].map(([k, l]) => (
              <Toggle key={k} on={base === k} set={() => setBase(k)} label={l} />
            ))}
          </div>
          {base === 'miscela' && (
            <div style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
              peso ordstat: {alpha.toFixed(2)}
              <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={e => setAlpha(parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
        </div>

        {/* regole */}
        <div style={{ ...styles.card, marginBottom: 10, opacity: base === 'ordstat' ? 0.4 : 1 }}>
          <div style={{ fontSize: 11, color: v.muted, fontFamily: MONO, marginBottom: 6 }}>
            Le 6 regole {base === 'ordstat' && '(non attive con statistica d\'ordine pura)'}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.keys(RULE_FN).map(k => (
              <Toggle key={k} on={rules[k]} set={x => setRules(r => ({ ...r, [k]: x }))} label={RULE_LABEL[k]} color={v.green} />
            ))}
          </div>
        </div>

        {/* banda + filtro */}
        <div style={{ ...styles.card, marginBottom: 12, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Toggle on={banda} set={setBanda} label={banda ? 'Banda: ON' : 'Banda: off'} />
          <Toggle on={filtro.attivo} set={x => setFiltro(f => ({ ...f, attivo: x }))} label={filtro.attivo ? 'Filtro estremi: ON' : 'Filtro estremi: off'} color={v.hot} />
          {filtro.attivo && (
            <span style={{ fontSize: 11, fontFamily: MONO, color: v.muted }}>
              tetto P1
              <input type="number" value={filtro.tettoP1} onChange={e => setFiltro(f => ({ ...f, tettoP1: +e.target.value }))} style={numInput} />
              pavimento P6
              <input type="number" value={filtro.pavimentoP6} onChange={e => setFiltro(f => ({ ...f, pavimentoP6: +e.target.value }))} style={numInput} />
            </span>
          )}
        </div>

        <button onClick={calcola} disabled={computing} style={{
          width: '100%', padding: 12, borderRadius: 8, fontFamily: MONO, fontSize: 14, cursor: computing ? 'default' : 'pointer',
          border: 'none', background: computing ? v.borderHi : v.accent, color: v.bg, fontWeight: 700
        }}>{computing ? 'calcolo…' : 'Calcola backtest'}</button>
      </section>

      {res && (
        <section style={styles.section}>
          <h2 style={styles.h2}>Risultato</h2>
          {renderPeriodo('Taratura — com\'è andata', res.trainS, res.trainO, false)}
          {renderPeriodo('Esame — se puoi fidartene', res.testS, res.testO, true)}
          <button onClick={salva} disabled={!testBatte} style={{
            width: '100%', padding: 10, borderRadius: 8, fontFamily: MONO, fontSize: 13, marginTop: 4,
            cursor: testBatte ? 'pointer' : 'default', border: `1px solid ${testBatte ? v.green : v.borderHi}`,
            background: 'transparent', color: testBatte ? v.green : v.muted
          }}>
            {salvato ? '✓ settaggio salvato' : testBatte ? 'Salva questo settaggio' : 'Non batte il riferimento all\'esame — non salvabile'}
          </button>
        </section>
      )}
    </div>
  )
}

const dateInput = { padding: '6px 8px', borderRadius: 6, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO, fontSize: 12 }
const numInput = { width: 46, marginLeft: 4, marginRight: 10, padding: '3px 5px', borderRadius: 5, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO, fontSize: 12 }
