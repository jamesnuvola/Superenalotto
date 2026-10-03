import rawDraws from '../src/data/draws.js'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'
import { writeFileSync } from 'node:fs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const MIN_START=Math.max(300,Number(process.env.MIN_START||300))
const WINDOW=Number(process.env.WINDOW||228)
const FEATURES=['sum','highnum','odd','repeat']
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0)
const high=d=>d[2].filter(n=>n>=46).length
const odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length
const hit=(a,b)=>a.filter(n=>b.includes(n)).length
const context=(h,lookback=21)=>{const w=h.slice(-lookback),p=h.slice(0,-lookback);const s=w.map(sum),hi=w.map(high),od=w.map(odd),rp=w.slice(1).map((d,i)=>repeat(w[i],d));const hs=p.map(sum),hh=p.map(high),ho=p.map(odd),hr=p.slice(1).map((d,i)=>repeat(p[i],d));const cls=(v,z)=>v>=(z.length?median(z):v)?'HIGH':'LOW';return {sum:cls(mean(s),hs),highnum:cls(mean(hi),hh),odd:cls(mean(od),ho),repeat:cls(mean(rp),hr),values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}}}
const allSuccess=[]
const byCondition=new Map()
for(let end=END;end>=MIN_START;end-=WINDOW){const start=Math.max(MIN_START,end-WINDOW+1);for(const feature of FEATURES)for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES){const key=`${feature}:${polarity}:${strat}`;for(let i=start;i<=end;i++){const h=draws.slice(0,i),c=context(h);if(c[feature]!==polarity)continue;const ticket=strategy(h,strat);if(!ticket)continue;const k=hit(ticket,draws[i][2]);if(k>=3){const x={i,date:draws[i][0],key,strat,ticket,hits:k,target:draws[i][2],context:c,trajectory:h.slice(-5).map(d=>({date:d[0],sum:sum(d),high:high(d),odd:odd(d)}))};allSuccess.push(x);if(!byCondition.has(key))byCondition.set(key,[]);byCondition.get(key).push(x)}}}}
// Deduplicate the same draw/condition seen in overlapping windows.
const uniq=new Map();for(const x of allSuccess)uniq.set(`${x.i}|${x.key}`,x)
const successes=[...uniq.values()].sort((a,b)=>a.i-b.i||a.key.localeCompare(b.key))
const grouped=[...byCondition.entries()].map(([key,arr])=>{const u=new Map(arr.map(x=>[x.i,x]));return {key,events:u.size}}).filter(x=>x.events).sort((a,b)=>b.events-a.events)
const recentStart=Math.max(MIN_START,END-227)
const recent=successes.filter(x=>x.i>=recentStart)
const lines=[]
lines.push('# SONAR — 3+ context analysis')
lines.push('')
lines.push(`Run: ${new Date().toISOString()}`)
lines.push(`Dataset draws: ${draws.length}; analysis horizon: ${MIN_START}–${END}; rolling window: ${WINDOW}`)
lines.push('')
lines.push('## What this analysis asks')
lines.push('For each frozen feature × regime × strategy condition, identify historical ≥3-hit events, then inspect their pre-draw context and nearby trajectory. The same event is deduplicated across overlapping windows. This is hypothesis generation, not validation.')
lines.push('')
lines.push('## Summary')
lines.push(`Unique ≥3 events across all tested windows/conditions: **${successes.length}**`)
lines.push(`Unique ≥3 events in latest ${END-recentStart+1} draws: **${recent.length}**`)
lines.push('')
lines.push('### Conditions with repeated distinct ≥3 events')
for(const x of grouped.slice(0,30))lines.push(`- ${x.key}: **${x.events}** distinct events`)
if(!grouped.length)lines.push('- none')
lines.push('')
lines.push('## Recent ≥3 events')
if(!recent.length)lines.push('No ≥3 events in the latest rolling window.')
for(const x of recent.slice(-60))lines.push(`- draw #${x.i} ${x.date} | ${x.key} | hits **${x.hits}** | ticket [${x.ticket.join(', ')}] | target [${x.target.join(', ')}] | context ${JSON.stringify(x.context.values)}`)
lines.push('')
lines.push('## Context fingerprints of recent events')
for(const x of recent.slice(-30)){lines.push(`### #${x.i} ${x.date} — ${x.key} — ${x.hits} hits`);lines.push(`Context: sum=${x.context.sum}, highnum=${x.context.highnum}, odd=${x.context.odd}, repeat=${x.context.repeat}`);lines.push(`Ticket: ${x.ticket.join(', ')}; target: ${x.target.join(', ')}`);lines.push(`Previous 5: ${x.trajectory.map(t=>`${t.date}:${t.sum}/${t.high}H/${t.odd}O`).join(' | ')}`);lines.push('')}
lines.push('## Methodological interpretation')
lines.push('- Repeated events are more useful than a single 3+ event, but overlapping windows do not create independent evidence.')
lines.push('- A condition is not promoted from this report. Its failures must be compared with nearby cases under the same frozen condition, then tested OOS.')
lines.push('- The key question is branching: which additional context separates success from failure, rather than whether one rule is always valid.')
writeFileSync('SONAR_3plus_context_analysis.md',lines.join('\n'))
console.log(lines.join('\n'))
