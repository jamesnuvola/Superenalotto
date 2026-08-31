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
function rankingPos(h, p, set, bandaStato) {
  let base
  if (set.base === 'ordstat') { base = new Map(); for (let val = 1; val <= 90; val++) base.set(val, ordScore(p, val)) }
  else {
    const comp = customComposite(h, p, set.rules)
    if (set.base === 'composito') base = comp
    else {
      const cn = normMax(comp); let omx = 1e-9; for (let val = 1; val <= 90; val++) omx = Math.max(omx, ordScore(p, val))
      base = new Map(); for (let val = 1; val <= 90; val++) base.set(val, (1 - set.alpha) * (cn.get(val) || 0) + set.alpha * (ordScore(p, val) / omx))
    }
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

const ymOf = d => { const [g, m, a] = d[0].split('/').map(Number); return a * 100 + m }
const needBanda = sets => sets.some(s => s && s.banda)

// backtest: per ogni posizione usa il suo settaggio; ritorna hit@3 e hit@1 per posizione
function backtestMix(draws, sets, fromYM, toYM) {
  const hit1 = [0, 0, 0, 0, 0, 0], hit3 = [0, 0, 0, 0, 0, 0]; let n = 0
  const usaBanda = needBanda(sets)
  for (let t = 1; t < draws.length; t++) {
    const y = ymOf(draws[t]); if (y < fromYM || y > toYM) continue
    const h = draws.slice(0, t)
    const banda = usaBanda ? statoRegolaPerPosizione(h) : null
    const real = draws[t][2]
    for (let p = 0; p < 6; p++) {
      const ranked = rankingPos(h, p, sets[p], banda)
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
function sestinaMix(h, sets, banda) {
  const s = []; let prev = 0
  for (let p = 0; p < 6; p++) {
    const ranked = rankingPos(h, p, sets[p], banda)
    for (const r of ranked) { if (r.num > prev && !s.includes(r.num)) { s.push(r.num); prev = r.num; break } }
  }
  return s.length === 6 ? s : null
}
function premiMix(draws, sets, fromYM, toYM) {
  const t = { '2': 0, '3': 0, '4': 0, '5': 0, '5+J': 0, '6': 0 }
  const usaBanda = needBanda(sets)
  for (let i = 1; i < draws.length; i++) {
    const y = ymOf(draws[i]); if (y < fromYM || y > toYM) continue
    const h = draws.slice(0, i)
    const banda = usaBanda ? statoRegolaPerPosizione(h) : null
    const g = sestinaMix(h, sets, banda); if (!g) continue
    const set = new Set(draws[i][2]); let m = 0; g.forEach(n => { if (set.has(n)) m++ })
    if (m === 5) { const np = g.filter(n => !set.has(n)); if (np.length && np[0] === draws[i][3]) { t['5+J']++; continue } }
    if (m >= 2) t[String(m)]++
  }
  return t
}

// genera N sestine col mix, coi rank REALISTICI per posizione (come la SERIA), non tutti a rank 1
function generaMix(draws, sets, quante) {
  const banda = needBanda(sets) ? statoRegolaPerPosizione(draws) : null
  const perPos = [0, 1, 2, 3, 4, 5].map(p => rankingPos(draws, p, sets[p], banda))
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

// ricerca ONESTA per una posizione: prova una griglia, sceglie il meglio in TARATURA,
// riporta il risultato all'ESAME. Non sceglie sull'esame (sarebbe overfitting).
function cercaPosizione(draws, baseSet, p, tf, tt, ef, et) {
  const griglia = []
  for (const base of ['composito', 'ordstat', 'miscela']) {
    const alphas = base === 'miscela' ? [0.5, 0.75] : [1]
    for (const alpha of alphas) for (const banda of [false, true]) {
      griglia.push({ ...baseSet, base, alpha, banda })
    }
  }
  let best = griglia[0], bestSc = -1
  for (const g of griglia) {
    const r = backtestUnaPos(draws, g, p, tf, tt)
    if (r > bestSc) { bestSc = r; best = g }
  }
  const trainHit = backtestUnaPos(draws, best, p, tf, tt)
  const examHit = backtestUnaPos(draws, best, p, ef, et)
  return { best, trainHit, examHit, provati: griglia.length }
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
  const applicaRicerca = () => { if (ricerca) { const b = ricerca.best; upd('base', b.base); upd('alpha', b.alpha); upd('banda', b.banda) } setRicerca(null) }

  const generaConMix = () => {
    setGenerating(true); setGenRes(null); setSelGen(0)
    setTimeout(() => { setGenRes(generaMix(draws, sets, 8)); setGenerating(false) }, 30)
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
          <div style={{ display: 'flex', gap: 6, marginBottom: cur.base === 'miscela' ? 10 : 8 }}>
            {[['composito', 'Composito'], ['ordstat', 'Ordine'], ['miscela', 'Miscela']].map(([k, l]) => (
              <Toggle key={k} on={cur.base === k} set={() => upd('base', k)} label={l} />
            ))}
          </div>
          {cur.base === 'miscela' && (
            <div style={{ fontSize: 11, fontFamily: MONO, color: v.muted, marginBottom: 8 }}>
              peso ordine: {cur.alpha.toFixed(2)}
              <input type="range" min="0" max="1" step="0.05" value={cur.alpha} onChange={e => upd('alpha', parseFloat(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          <div style={{ opacity: cur.base === 'ordstat' ? 0.4 : 1, marginBottom: 8 }}>
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
            <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: v.surface, border: `1px solid ${v.border}` }}>
              <div style={{ fontSize: 11, fontFamily: MONO, color: v.text }}>
                Migliore in taratura: <strong>{ricerca.best.base}{ricerca.best.base === 'miscela' ? ` α${ricerca.best.alpha}` : ''}{ricerca.best.banda ? '+banda' : ''}</strong>.
                All'esame: {ricerca.examHit} hit@3 (taratura {ricerca.trainHit}).
              </div>
              <button onClick={applicaRicerca} style={{ ...btnSec(false), marginTop: 6 }}>Applica a {LABELS[posSel]}</button>
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
    </div>
  )
}

const dateInput = { padding: '6px 8px', borderRadius: 6, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO, fontSize: 12 }
const miniInput = { width: 40, margin: '0 2px', padding: '3px 4px', borderRadius: 5, border: `1px solid ${v.borderHi}`, background: v.card, color: v.text, fontFamily: MONO, fontSize: 12 }
const btnPri = (busy) => ({ width: '100%', padding: 12, borderRadius: 8, fontFamily: MONO, fontSize: 14, cursor: busy ? 'default' : 'pointer', border: 'none', background: busy ? v.borderHi : v.accent, color: v.bg, fontWeight: 700 })
const btnSec = (busy) => ({ flex: 1, padding: '9px 8px', borderRadius: 7, fontFamily: MONO, fontSize: 11, cursor: busy ? 'default' : 'pointer', border: `1px solid ${v.accent}`, background: 'transparent', color: v.accent })
