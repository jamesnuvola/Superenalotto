import rawDraws from '../src/data/draws.js'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'
import { writeFileSync } from 'node:fs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
if(END<0||!draws.length)throw new Error('No valid draw history available')
const history=draws.slice(0,END+1)
const tickets=STRATEGIES.map(name=>({name,ticket:strategy(history,name)})).filter(x=>Array.isArray(x.ticket)&&x.ticket.length===6)
if(tickets.length<2)throw new Error(`Insufficient valid strategy tickets: ${tickets.length}`)

const votes=new Map(Array.from({length:90},(_,i)=>[i+1,0]))
for(const {ticket} of tickets){
  const unique=[...new Set(ticket)]
  if(unique.length!==6||unique.some(n=>!Number.isInteger(n)||n<1||n>90))throw new Error(`Invalid ${ticket.join(',')} strategy ticket`)
  for(const n of unique)votes.set(n,votes.get(n)+1)
}

const ranked=[...votes.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])
const consensus=ranked.slice(0,6).map(x=>x[0]).sort((a,b)=>a-b)
if(new Set(consensus).size!==6)throw new Error('Consensus ticket is not six unique numbers')

const lines=[]
lines.push('# SONAR — next ticket candidate')
lines.push('')
lines.push(`Generated: ${new Date().toISOString()}`)
lines.push(`History through draw index ${END}; source date: ${draws[END]?.[0]||'n/a'}`)
lines.push(`Strategies contributing: ${tickets.length}/${STRATEGIES.length}`)
lines.push('')
lines.push('## Candidate')
lines.push(`**${consensus.join(', ')}**`)
lines.push('')
lines.push('This is a transparent ensemble candidate, not a prediction or validated advantage. It is formed only from the current strategy library, with one vote per number per strategy; no future draw information is used.')
lines.push('')
lines.push('## Source tickets')
for(const x of tickets)lines.push(`- ${x.name}: ${x.ticket.join(', ')}`)
lines.push('')
lines.push('## Number support')
for(const [n,v] of ranked.filter(x=>x[1]>0))lines.push(`- ${n}: ${v}/${tickets.length} strategies`)
writeFileSync('SONAR_next_ticket.md',lines.join('\n'))
console.log(lines.join('\n'))
