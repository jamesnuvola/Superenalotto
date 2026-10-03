import rawDraws from '../src/data/draws.js'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'
import { writeFileSync } from 'node:fs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const WINDOW=Number(process.env.WINDOW||228)
const RECENT=Number(process.env.RECENT||60)
const START=Math.max(300,END-WINDOW+1)
const RECENT_START=Math.max(300,END-RECENT+1)
const FEATURES=['sum','highnum','odd','repeat']
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0)
const high=d=>d[2].filter(n=>n>=46).length
const odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length
const hit=(a,b)=>a.filter(n=>b.includes(n)).length
const context=(h,lookback=21)=>{const w=h.slice(-lookback),p=h.slice(0,-lookback);const s=w.map(sum),hi=w.map(high),od=w.map(odd),rp=w.slice(1).map((d,i)=>repeat(w[i],d));const hs=p.map(sum),hh=p.map(high),ho=p.map(odd),hr=p.slice(1).map((d,i)=>repeat(p[i],d));const cls=(v,z)=>v>=(z.length?median(z):v)?'HIGH':'LOW';return {sum:cls(mean(s),hs),highnum:cls(mean(hi),hh),odd:cls(mean(od),ho),repeat:cls(mean(rp),hr),values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}}}
const fp=c=>`${c.sum}/${c.highnum}/${c.odd}/${c.repeat}`
const sameFingerprint=(a,b)=>fp(a)===fp(b)

// One pass over the latest window: context and strategy tickets are computed once per draw.
const events=[]
const drawAudit=[]
for(let i=START;i<=END;i++){
  const h=draws.slice(0,i), c=context(h)
  const tickets=new Map(STRATEGIES.map(s=>[s,strategy(h,s)]))
  const active=[]
  let best=0
  for(const feature of FEATURES)for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES){
    if(c[feature]!==polarity)continue
    const ticket=tickets.get(strat);if(!ticket)continue
    const k=hit(ticket,draws[i][2]); if(k>best)best=k
    active.push({key:`${feature}:${polarity}:${strat}`,hits:k,ticket})
    if(k<3)continue
    events.push({i,date:draws[i][0],key:`${feature}:${polarity}:${strat}`,ticket,hits:k,target:draws[i][2],context:c,trajectory:h.slice(-5).map(d=>({date:d[0],sum:sum(d),high:high(d),odd:odd(d)}))})
  }
  drawAudit.push({i,date:draws[i][0],context:c,best,active})
}
const grouped=[...new Set(events.map(x=>x.key))].map(key=>({key,events:events.filter(x=>x.key===key).length})).sort((a,b)=>b.events-a.events||a.key.localeCompare(b.key))

// Compare the most recent draws with the historical 3+ fingerprint: LOW/LOW/LOW/HIGH.
const targetFingerprint='LOW/LOW/LOW/HIGH'
const fingerprintRows=drawAudit.filter(x=>fp(x.context)===targetFingerprint)
const recentFingerprint=fingerprintRows.filter(x=>x.i>=RECENT_START)
const fingerprintStats=STRATEGIES.map(strat=>{
  const rows=fingerprintRows.map(x=>{const t=strategy(draws.slice(0,x.i),strat);return t?hit(t,draws[x.i][2]):null}).filter(x=>x!==null)
  const recentRows=fingerprintRows.filter(x=>x.i>=RECENT_START).map(x=>{const t=strategy(draws.slice(0,x.i),strat);return t?hit(t,draws[x.i][2]):null}).filter(x=>x!==null)
  const ge3=rows.filter(x=>x>=3).length, rge3=recentRows.filter(x=>x>=3).length
  return {strat,n:rows.length,mean:mean(rows),ge3,recentN:recentRows.length,recentMean:mean(recentRows),recentGe3:rge3}
}).filter(x=>x.n>0).sort((a,b)=>b.mean-a.mean)

// Recent 30/60 audit: this is deliberately descriptive, not a selection mechanism.
const recentRows=drawAudit.filter(x=>x.i>=RECENT_START)
const recentBest=recentRows.map(x=>({i:x.i,date:x.date,fp:fp(x.context),best:x.best,top:x.active.filter(a=>a.hits===x.best).slice(0,4).map(a=>a.key),target:draws[x.i][2]}))

const lines=[]
lines.push('# SONAR — 3+ context analysis')
lines.push('')
lines.push(`Run: ${new Date().toISOString()}`)
lines.push(`Dataset draws: ${draws.length}; latest rolling window: ${START}–${END} (${WINDOW} draws); recent audit: ${RECENT} draws`) 
lines.push('')
lines.push('## What this analysis asks')
lines.push('Within the latest frozen window, identify every ≥3-hit event across the current condition × strategy matrix, then compare the recent regime with the historical 3+ fingerprint. This is hypothesis generation, not validation.')
lines.push('')
lines.push('## Summary')
lines.push(`Unique draw/condition ≥3 events in the latest window: **${events.length}**`)
lines.push(`Distinct conditions producing ≥3: **${grouped.length}**`)
lines.push('')
lines.push('### Conditions producing ≥3')
if(!grouped.length)lines.push('- none')
for(const x of grouped)lines.push(`- ${x.key}: **${x.events}** events`)
lines.push('')
lines.push('## Event list')
if(!events.length)lines.push('No ≥3 events in the latest rolling window.')
for(const x of events)lines.push(`- draw #${x.i} ${x.date} | ${x.key} | hits **${x.hits}** | ticket [${x.ticket.join(', ')}] | target [${x.target.join(', ')}] | context ${JSON.stringify(x.context.values)}`)
lines.push('')
lines.push('## Context fingerprints')
for(const x of events){lines.push(`### #${x.i} ${x.date} — ${x.key} — ${x.hits} hits`);lines.push(`Context: sum=${x.context.sum}, highnum=${x.context.highnum}, odd=${x.context.odd}, repeat=${x.context.repeat}`);lines.push(`Ticket: ${x.ticket.join(', ')}; target: ${x.target.join(', ')}`);lines.push(`Previous 5: ${x.trajectory.map(t=>`${t.date}:${t.sum}/${t.high}H/${t.odd}O`).join(' | ')}`);lines.push('')}

lines.push('## Recent regime comparison')
lines.push(`Reference fingerprint from the historical 3+ event: **${targetFingerprint}** (the 20/11/2025 event #2747).`)
lines.push(`Occurrences of this exact fingerprint in the latest rolling window: **${fingerprintRows.length}**; occurrences in the latest ${RECENT} draws: **${recentFingerprint.length}**.`)
if(recentFingerprint.length)lines.push(`Recent matching draws: ${recentFingerprint.map(x=>`#${x.i} ${x.date} (best=${x.best})`).join(' | ')}`)
lines.push('')
lines.push('### Strategy performance inside the exact fingerprint')
lines.push('| Strategy | N historical | Mean hits | ≥3 | N recent | Mean recent | ≥3 recent |')
lines.push('|---|---:|---:|---:|---:|---:|---:|')
for(const x of fingerprintStats)lines.push(`| ${x.strat} | ${x.n} | ${x.mean.toFixed(3)} | ${x.ge3} | ${x.recentN} | ${x.recentMean.toFixed(3)} | ${x.recentGe3} |`)
lines.push('')
lines.push('### Last recent draws: maximum hit obtainable inside the frozen condition matrix')
for(const x of recentBest.slice(-30))lines.push(`- #${x.i} ${x.date} | fp=${x.fp} | best=${x.best} | ${x.top.join(', ')}`)
lines.push('')
lines.push('## Methodological interpretation')
lines.push('- The historical 3+ fingerprint is used as a comparator, not as a rule to deploy.')
lines.push('- Matching the same fingerprint in recent draws is useful only if the hit distribution and failure cases are also examined.')
lines.push('- A recent absence of ≥3 does not invalidate a historical condition; a recent presence does not confirm it.')
lines.push('- The next branch should compare exact-fingerprint successes against exact-fingerprint failures and then test the separating feature OOS.')
writeFileSync('SONAR_3plus_context_analysis.md',lines.join('\n'))
console.log(lines.join('\n'))