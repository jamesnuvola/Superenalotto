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
const events=[]
const drawAudit=[]
for(let i=START;i<=END;i++){
  const h=draws.slice(0,i),c=context(h),tickets=new Map(STRATEGIES.map(s=>[s,strategy(h,s)])),active=[]
  let best=0
  for(const feature of FEATURES)for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES){
    if(c[feature]!==polarity)continue
    const ticket=tickets.get(strat);if(!ticket)continue
    const k=hit(ticket,draws[i][2]);best=Math.max(best,k);active.push({key:`${feature}:${polarity}:${strat}`,hits:k,ticket})
    if(k>=3)events.push({i,date:draws[i][0],key:`${feature}:${polarity}:${strat}`,ticket,hits:k,target:draws[i][2],context:c,trajectory:h.slice(-5).map(d=>({date:d[0],sum:sum(d),high:high(d),odd:odd(d)}))})
  }
  drawAudit.push({i,date:draws[i][0],context:c,best,active})
}

// Parent events are unique draw outcomes. Child observations are condition × strategy explanations of that same draw.
const parentMap=new Map()
for(const e of events){if(!parentMap.has(e.i))parentMap.set(e.i,{i:e.i,date:e.date,hits:e.hits,target:e.target,context:e.context,children:[]});parentMap.get(e.i).children.push(e)}
const parentEvents=[...parentMap.values()]
const grouped=[...new Set(events.map(x=>x.key))].map(key=>({key,observations:events.filter(x=>x.key===key).length,uniqueDraws:new Set(events.filter(x=>x.key===key).map(x=>x.i)).size})).sort((a,b)=>b.uniqueDraws-a.uniqueDraws||a.key.localeCompare(b.key))

const targetFingerprint='LOW/LOW/LOW/HIGH'
const fingerprintRows=drawAudit.filter(x=>fp(x.context)===targetFingerprint)
const recentFingerprint=fingerprintRows.filter(x=>x.i>=RECENT_START)
const fingerprintStats=STRATEGIES.map(strat=>{
  const rows=fingerprintRows.map(x=>{const t=strategy(draws.slice(0,x.i),strat);return t?hit(t,draws[x.i][2]):null}).filter(x=>x!==null)
  const recentRows=recentFingerprint.map(x=>{const t=strategy(draws.slice(0,x.i),strat);return t?hit(t,draws[x.i][2]):null}).filter(x=>x!==null)
  return {strat,n:rows.length,mean:mean(rows),ge3:rows.filter(x=>x>=3).length,recentN:recentRows.length,recentMean:mean(recentRows),recentGe3:recentRows.filter(x=>x>=3).length}
}).filter(x=>x.n>0).sort((a,b)=>b.mean-a.mean)

// Second-level audit: compare the unique historical success draws with same-fingerprint failures.
const secondLevel=[]
for(const p of parentEvents){
  if(fp(p.context)!==targetFingerprint)continue
  const same=fingerprintRows.filter(x=>x.i!==p.i)
  const featureStats=['sum','highnum','odd','repeat'].map(f=>({feature:f,success:p.context.values[f],failureMean:mean(same.map(x=>x.context.values[f])),recentMean:mean(recentFingerprint.map(x=>x.context.values[f]))}))
  secondLevel.push({draw:p.i,date:p.date,featureStats,trajectory:p.children[0].trajectory})
}

const recentRows=drawAudit.filter(x=>x.i>=RECENT_START)
const recentBest=recentRows.map(x=>({i:x.i,date:x.date,fp:fp(x.context),best:x.best,top:x.active.filter(a=>a.hits===x.best).slice(0,4).map(a=>a.key),target:draws[x.i][2]}))
const lines=[]
lines.push('# SONAR — 3+ context analysis')
lines.push('')
lines.push(`Run: ${new Date().toISOString()}`)
lines.push(`Dataset draws: ${draws.length}; latest rolling window: ${START}–${END} (${WINDOW} draws); recent audit: ${RECENT} draws`)
lines.push('')
lines.push('## What this analysis asks')
lines.push('Identify ≥3-hit parent events across the current condition × strategy matrix, keep condition × strategy observations as child explanations, then compare the historical success context with same-fingerprint failures. This is hypothesis generation, not validation.')
lines.push('')
lines.push('## Corrected counting')
lines.push(`Unique draw outcomes producing ≥3: **${parentEvents.length}**`)
lines.push(`Condition × strategy ≥3 observations: **${events.length}**`)
lines.push(`Distinct condition × strategy keys: **${grouped.length}**`)
lines.push('A single draw can generate several child observations; they are never counted as independent successes.')
lines.push('')
lines.push('## Parent events')
if(!parentEvents.length)lines.push('- none')
for(const p of parentEvents)lines.push(`- draw #${p.i} ${p.date} | hits **${p.hits}** | target [${p.target.join(', ')}] | context ${fp(p.context)} | child observations **${p.children.length}**`)
lines.push('')
lines.push('## Child condition × strategy observations')
if(!events.length)lines.push('- none')
for(const x of events)lines.push(`- draw #${x.i} ${x.date} | ${x.key} | hits **${x.hits}** | ticket [${x.ticket.join(', ')}]`)
lines.push('')
lines.push('## Context fingerprints')
for(const p of parentEvents){lines.push(`### #${p.i} ${p.date} — ${p.hits} hits`);lines.push(`Fingerprint: ${fp(p.context)}`);lines.push(`Children: ${p.children.map(x=>x.key).join(', ')}`);lines.push(`Previous 5: ${p.children[0].trajectory.map(t=>`${t.date}:${t.sum}/${t.high}H/${t.odd}O`).join(' | ')}`);lines.push('')}
lines.push('## Exact-fingerprint comparison')
lines.push(`Reference fingerprint: **${targetFingerprint}**; historical occurrences **${fingerprintRows.length}**; recent occurrences **${recentFingerprint.length}**.`)
lines.push('')
lines.push('| Strategy | N historical | Mean hits | ≥3 | N recent | Mean recent | ≥3 recent |')
lines.push('|---|---:|---:|---:|---:|---:|---:|')
for(const x of fingerprintStats)lines.push(`| ${x.strat} | ${x.n} | ${x.mean.toFixed(3)} | ${x.ge3} | ${x.recentN} | ${x.recentMean.toFixed(3)} | ${x.recentGe3} |`)
lines.push('')
lines.push('## Second-level context audit')
if(!secondLevel.length)lines.push('- no historical parent success in reference fingerprint')
for(const s of secondLevel){lines.push(`### Success draw #${s.draw} ${s.date}`);for(const x of s.featureStats)lines.push(`- ${x.feature}: success=${x.success.toFixed(3)} | same-fingerprint failure mean=${x.failureMean.toFixed(3)} | recent mean=${x.recentMean.toFixed(3)}`);lines.push(`- previous 5: ${s.trajectory.map(t=>`${t.date}:${t.sum}/${t.high}H/${t.odd}O`).join(' | ')}`)}
lines.push('')
lines.push('## Recent audit')
for(const x of recentBest.slice(-30))lines.push(`- #${x.i} ${x.date} | fp=${x.fp} | best=${x.best} | ${x.top.join(', ')}`)
lines.push('')
lines.push('## Methodological interpretation')
lines.push('- Parent draw counts are the evidence denominator; child observations are explanatory candidates only.')
lines.push('- The historical fingerprint is not a deployment rule.')
lines.push('- Second-level differences are descriptive until frozen and tested OOS against same-fingerprint failures and a conditional null.')
lines.push('- Failures remain evidence and are not discarded.')
writeFileSync('SONAR_3plus_context_analysis.md',lines.join('\n'))
console.log(lines.join('\n'))
