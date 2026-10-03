import draws from '../src/data/draws.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const START=Math.max(300,Number(process.env.START||2700))
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const STATE='SONAR_research_state.json'
const REPORT='SONAR_autonomous_research_report.md'
const HIGH_HIT=Number(process.env.HIGH_HIT||3)
const BUDGET=Number(process.env.BUDGET||64)

const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const nums=Array.from({length:90},(_,i)=>i+1)
const sum=d=>d[2].reduce((a,b)=>a+b,0)
const high=d=>d[2].filter(n=>n>=46).length
const odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length
const gap=(h,n)=>{let last=-1;for(let i=h.length-1;i>=0;i--)if(h[i][2].includes(n)){last=i;break}return last<0?h.length:h.length-1-last}
const overlap=(a,b)=>a.filter(x=>b.includes(x)).length
const hit=(ticket,real)=>ticket.filter(n=>real.includes(n)).length

function state(h){
  const w=h.slice(-21), sums=w.map(sum), highs=w.map(high), odds=w.map(odd)
  const reps=w.slice(1).map((d,i)=>repeat(w[i],d))
  const hist=[]
  for(let j=21;j<h.length;j++)hist.push(h.slice(j-21,j).reduce((s,d)=>s+sum(d),0))
  const sm=mean(sums), ref=hist.length?median(hist):sm
  return {
    sum:sm>=ref?'HIGH':'LOW', highnum:mean(highs)>=3?'HIGH':'LOW', odd:mean(odds)>=3?'HIGH':'LOW',
    repeat:mean(reps)>=.5?'HIGH':'LOW',
    sumValue:sm, highnumValue:mean(highs), oddValue:mean(odds), repeatValue:mean(reps),
    lastSum:sum(h.at(-1)), lastHigh:high(h.at(-1)), lastOdd:odd(h.at(-1)),
    gaps:[...nums].map(n=>gap(h,n)), recentOverlap:overlap(h.at(-1)?.[2]||[],h.at(-2)?.[2]||[])
  }
}

function trajectory(h){
  const w=h.slice(-5)
  return {sum:w.map(sum),high:w.map(high),odd:w.map(odd),repeat:w.slice(1).map((d,i)=>repeat(w[i],d))}
}
function eventSignature(h,real){
  const s=state(h), tr=trajectory(h)
  return {state:{sum:s.sum,highnum:s.highnum,odd:s.odd,repeat:s.repeat},trajectory:tr,targetSum:sum(real),targetHigh:high({2:real}),targetOdd:odd({2:real})}
}

const candidateDefs=[]
for(const feature of ['sum','highnum','odd','repeat'])for(const lookback of [7,14,21,30,60])for(const polarity of ['HIGH','LOW'])candidateDefs.push({id:`${feature}:${lookback}:${polarity}`,feature,lookback,polarity})

function selectCandidates(items,done){
  return items.filter(x=>!done.has(x.id)).slice(0,BUDGET)
}

let db={version:1,created:'2026-10-03',tested:[],findings:[],cursor:0}
if(existsSync(STATE)){
  try{db={...db,...JSON.parse(readFileSync(STATE,'utf8'))}}catch{}
}
const done=new Set(db.tested.map(x=>x.id))
const candidates=selectCandidates(candidateDefs,done)

for(const c of candidates){
  const cases=[],hits=[]
  for(let i=START;i<=END;i++){
    const h=draws.slice(0,i),s=state(h),v=s[c.feature==='sum'?'sum':c.feature==='highnum'?'highnum':c.feature==='odd'?'odd':'repeat']
    if(v!==c.polarity)continue
    const real=draws[i][2]
    // This engine deliberately records the event/context; it does not invent a ticket.
    const sig=eventSignature(h,real)
    cases.push({i,date:draws[i][0],signature:sig})
    if(real.length===6)hits.push({i,date:draws[i][0],target:real,signature:sig})
  }
  const highEvents=cases.filter(x=>x.signature.targetSum>0) // all draws retained; high-hit mining is strategy-specific
  db.tested.push({id:c.id,range:[START,END],cases:cases.length,highHitCases:highEvents.length,status:'DISCOVERED'})
  db.findings.push({id:c.id,context:c,repeatability:cases.length,examples:cases.filter(x=>x.signature.targetHigh>=3).slice(0,12)})
}

db.cursor+=candidates.length
db.lastRun={at:new Date().toISOString(),range:[START,END],budget:BUDGET,remaining:candidateDefs.length-db.tested.length}
writeFileSync(STATE,JSON.stringify(db,null,2))

const contextCounts=new Map()
for(const f of db.findings){const key=`${f.context.feature}=${f.context.polarity}`;contextCounts.set(key,(contextCounts.get(key)||0)+f.repeatability)}
let out='# SONAR — Autonomous Research Engine\n\n'
out+=`Run: ${db.lastRun.at}\nDataset target: ${draws[START][0]} → ${draws[END][0]} (${END-START+1} eventi)\nBudget: ${BUDGET} nodi\nResidui: ${db.lastRun.remaining}\n\n`
out+='## Protocollo\n\n1. Enumerare contesti congelati.\n2. Registrare la forma del momento prima dell evento.\n3. Cercare eventi ad alto hit solo dopo aver definito il contesto.\n4. Separare scoperta, congelamento e OOS.\n5. Cercare complementi e residui dopo l introduzione del motore strategie.\n6. Non promuovere una regola per media globale: una scoperta resta DISCOVERED finché non supera un OOS condizionato e un null nello stesso contesto.\n\n'
out+='## Stato della coda\n\n| Contesto | Casi | Stato |\n|---|---:|---|\n'
for(const [k,v] of contextCounts)out+=`| ${k} | ${v} | DISCOVERED |\n`
out+='\n## Prossimo ciclo\n\nLa coda viene consumata in modo deterministico. Quando sarà esaurita, il motore potrà espandere la grammatica con traiettorie, catene, posizioni e combinazioni strategia→complemento senza ripetere nodi già testati.\n'
writeFileSync(REPORT,out)
console.log(out)
