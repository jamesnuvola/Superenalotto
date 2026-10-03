import rawDraws from '../src/data/draws.js'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'
import { writeFileSync } from 'node:fs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const WINDOW=Number(process.env.WINDOW||228)
const START=Math.max(300,END-WINDOW+1)
const FEATURES=['sum','highnum','odd','repeat']
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0)
const high=d=>d[2].filter(n=>n>=46).length
const odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length
const hit=(a,b)=>a.filter(n=>b.includes(n)).length
const context=(h,lookback=21)=>{const w=h.slice(-lookback),p=h.slice(0,-lookback);const s=w.map(sum),hi=w.map(high),od=w.map(odd),rp=w.slice(1).map((d,i)=>repeat(w[i],d));const hs=p.map(sum),hh=p.map(high),ho=p.map(odd),hr=p.slice(1).map((d,i)=>repeat(p[i],d));const cls=(v,z)=>v>=(z.length?median(z):v)?'HIGH':'LOW';return {sum:cls(mean(s),hs),highnum:cls(mean(hi),hh),odd:cls(mean(od),ho),repeat:cls(mean(rp),hr),values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}}}

// One pass over the latest window: context and strategy tickets are computed once per draw.
const events=[]
for(let i=START;i<=END;i++){
  const h=draws.slice(0,i), c=context(h)
  const tickets=new Map(STRATEGIES.map(s=>[s,strategy(h,s)]))
  for(const feature of FEATURES)for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES){
    if(c[feature]!==polarity)continue
    const ticket=tickets.get(strat);if(!ticket)continue
    const k=hit(ticket,draws[i][2]);if(k<3)continue
    events.push({i,date:draws[i][0],key:`${feature}:${polarity}:${strat}`,ticket,hits:k,target:draws[i][2],context:c,trajectory:h.slice(-5).map(d=>({date:d[0],sum:sum(d),high:high(d),odd:odd(d)}))})
  }
}
const grouped=[...new Set(events.map(x=>x.key))].map(key=>({key,events:events.filter(x=>x.key===key).length})).sort((a,b)=>b.events-a.events||a.key.localeCompare(b.key))
const lines=[]
lines.push('# SONAR — 3+ context analysis')
lines.push('')
lines.push(`Run: ${new Date().toISOString()}`)
lines.push(`Dataset draws: ${draws.length}; latest rolling window: ${START}–${END} (${WINDOW} draws)`)
lines.push('')
lines.push('## What this analysis asks')
lines.push('Within the latest frozen window, identify every ≥3-hit event across the current condition × strategy matrix, then inspect its pre-draw context and trajectory. This avoids mixing overlapping historical windows into pseudo-independent evidence.')
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
lines.push('## Methodological interpretation')
lines.push('- A 3+ event is a starting point, not evidence of a universal rule.')
lines.push('- Repeated conditions matter more than isolated events, but still require comparison with failures and an OOS split.')
lines.push('- The next test should ask which additional context separates successes from failures under the same frozen condition.')
writeFileSync('SONAR_3plus_context_analysis.md',lines.join('\n'))
console.log(lines.join('\n'))
