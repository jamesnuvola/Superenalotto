import draws from '../src/data/draws.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'

const START=Math.max(300,Number(process.env.START||2700))
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const STATE='SONAR_research_state.json'
const REPORT='SONAR_autonomous_research_report.md'
const BUDGET=Number(process.env.BUDGET||16)
const HIGH_HIT=Number(process.env.HIGH_HIT||3)
const LOOKBACK=Number(process.env.LOOKBACK||21)

const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0)
const high=d=>d[2].filter(n=>n>=46).length
const odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length
const hit=(a,b)=>a.filter(n=>b.includes(n)).length
const choose=(n,k)=>{if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r*= (n-k+i)/i;return r}
const pGe3=1-(choose(84,6)/choose(90,6))-(choose(6,1)*choose(84,5)/choose(90,6))-(choose(6,2)*choose(84,4)/choose(90,6))

const context=(h,lookback=LOOKBACK)=>{
  const w=h.slice(-lookback),s=w.map(sum),hi=w.map(high),od=w.map(odd),rp=w.slice(1).map((d,i)=>repeat(w[i],d))
  const hist=[]
  for(let j=lookback;j<h.length;j++)hist.push(h.slice(j-lookback,j).reduce((z,d)=>z+sum(d),0))
  return {
    sum:mean(s)>=(hist.length?median(hist):mean(s))?'HIGH':'LOW',
    highnum:mean(hi)>=3?'HIGH':'LOW',
    odd:mean(od)>=3?'HIGH':'LOW',
    repeat:mean(rp)>=.5?'HIGH':'LOW',
    values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}
  }
}

const featureNames=['sum','highnum','odd','repeat']
const featureStates=['HIGH','LOW']
const defs=[]
for(const feature of featureNames)for(const polarity of featureStates)for(const strat of STRATEGIES)
  defs.push({id:`STATE|${feature}:${polarity}|${strat}`,kind:'STATE',feature,polarity,strat})
for(const feature of featureNames)for(const from of featureStates)for(const to of featureStates)for(const strat of STRATEGIES)
  defs.push({id:`TRANSITION|${feature}:${from}>${to}|${strat}`,kind:'TRANSITION',feature,from,to,strat})
for(const feature of featureNames)for(const a of featureStates)for(const b of featureStates)for(const c of featureStates)for(const strat of STRATEGIES)
  defs.push({id:`CHAIN|${feature}:${a}>${b}>${c}|${strat}`,kind:'CHAIN',feature,chain:[a,b,c],strat})

let db={
  version:3,
  created:'2026-10-04',
  tested:[],
  findings:[],
  queue:defs.map(x=>x.id),
  hypotheses:[],
  promotions:[]
}
if(existsSync(STATE))try{db={...db,...JSON.parse(readFileSync(STATE,'utf8'))}}catch{}

const done=new Set(db.tested.map(x=>x.id))
const pending=defs.filter(x=>!done.has(x.id)).slice(0,BUDGET)

const qualifies=(c,i)=>{
  const h=draws.slice(0,i)
  const now=context(h)
  const prev=context(h.slice(0,-1))
  const prev2=context(h.slice(0,-2))
  if(c.kind==='STATE')return now[c.feature]===c.polarity
  if(c.kind==='TRANSITION')return prev[c.feature]===c.from&&now[c.feature]===c.to
  return prev2[c.feature]===c.chain[0]&&prev[c.feature]===c.chain[1]&&now[c.feature]===c.chain[2]
}

for(const c of pending){
  const cases=[],highCases=[],complements=[]
  for(let i=START;i<=END;i++){
    if(!qualifies(c,i))continue
    const h=draws.slice(0,i),real=draws[i][2],ticket=strategy(h,c.strat)
    if(!ticket||ticket.length!==6)continue
    const k=hit(ticket,real)
    const now=context(h),prev=context(h.slice(0,-1)),prev2=context(h.slice(0,-2))
    const statePath=c.kind==='STATE'?[now[c.feature]]:c.kind==='TRANSITION'?[prev[c.feature],now[c.feature]]:[prev2[c.feature],prev[c.feature],now[c.feature]]
    const item={i,date:draws[i][0],ticket,hits:k,target:real,statePath}
    cases.push(item)
    if(k>=HIGH_HIT)highCases.push(item)
    if(k>=HIGH_HIT&&k<6){
      const residual=real.filter(n=>!ticket.includes(n)),best=[]
      for(const alt of STRATEGIES.filter(x=>x!==c.strat)){
        const t2=strategy(h,alt)
        best.push({strategy:alt,hits:hit(t2,residual),residualHits:hit(t2,real)})
      }
      best.sort((a,b)=>b.hits-a.hits||b.residualHits-a.residualHits)
      complements.push({i,date:draws[i][0],base:c.strat,baseHits:k,residual,best:best.slice(0,3)})
    }
  }
  const hits=cases.map(x=>x.hits)
  const ge2=cases.filter(x=>x.hits>=2).length
  const ge3=cases.filter(x=>x.hits>=3).length
  const ge4=cases.filter(x=>x.hits>=4).length
  const ge5=cases.filter(x=>x.hits>=5).length
  const ge6=cases.filter(x=>x.hits===6).length
  const avg=mean(hits)
  const rate3=cases.length?ge3/cases.length:0
  const lift3=pGe3?rate3/pGe3:0
  const evidenceScore=cases.length>=30?Math.min(1,cases.length/100):cases.length/100
  const discoveryScore=cases.length?Math.max(0,Math.min(100,(avg-.4)*100 + (lift3-1)*10 + evidenceScore*10)):0
  const status=cases.length<20?'LOW_SAMPLE':discoveryScore>=12?'CANDIDATE':'DISCOVERED'
  db.tested.push({id:c.id,kind:c.kind,range:[START,END],cases:cases.length,avg,ge2,ge3,ge4,ge5,ge6,rate3,lift3,discoveryScore,status})
  db.findings.push({id:c.id,context:c,cases:highCases.slice(0,30),complements:complements.slice(0,30),baseline:{pGe3},status})
  if(status==='CANDIDATE')db.hypotheses.push({id:c.id,reason:'context-conditioned discovery',status:'DISCOVERED',next:'FREEZE_DEFINITION_AND_OOS'})
}

db.lastRun={at:new Date().toISOString(),range:[START,END],budget:BUDGET,processed:pending.length,remaining:defs.length-db.tested.length,totalDefinitions:defs.length}

const recent=db.tested.slice(-pending.length)
const candidates=[...db.tested].filter(x=>x.status==='CANDIDATE').sort((a,b)=>b.discoveryScore-a.discoveryScore).slice(0,20)
const transitions=recent.filter(x=>x.kind==='TRANSITION').length
const chains=recent.filter(x=>x.kind==='CHAIN').length
let out=`# SONAR — Autonomous Research Engine\n\nRun: ${db.lastRun.at}\nTarget: ${draws[START][0]} → ${draws[END][0]}\nNodi processati: ${pending.length}\nNodi residui: ${db.lastRun.remaining}/${defs.length}\nTransizioni analizzate in questo ciclo: ${transitions}\nCatene analizzate in questo ciclo: ${chains}\n\n`
out+=`## Architettura\n\nIl motore esplora tre livelli: **Stato → Transizione → Catena di 3 Stati**. Ogni livello viene incrociato con tutte le strategie disponibili. I nodi già testati non vengono ripetuti. Gli eventi ≥3 vengono conservati e gli eventi 4/5 vengono usati per cercare strategie complementari sul residuo.\n\n`
out+=`## Baseline\n\nPer una sestina casuale 6/90, P(≥3 hit) = ${(pGe3*100).toFixed(3)}%. La baseline viene usata come null teorico comune; i candidati non vengono promossi sulla sola media.\n\n`
out+='## Candidati da approfondire\n\n| Nodo | N | Hit medi | ≥2 | ≥3 | Lift ≥3 | Score | Stato |\n|---|---:|---:|---:|---:|---:|---:|---|\n'
for(const x of candidates.slice(0,20))out+=`| ${x.id} | ${x.cases} | ${x.avg.toFixed(3)} | ${x.ge2} | ${x.ge3} | ${x.lift3.toFixed(2)}x | ${x.discoveryScore.toFixed(1)} | ${x.status} |\n`
out+='\n## Ultimo ciclo\n\n| Nodo | N | Hit medi | ≥2 | ≥3 | ≥4 | ≥5 | 6/6 | Stato |\n|---|---:|---:|---:|---:|---:|---:|---:|---|\n'
for(const x of recent)out+=`| ${x.id} | ${x.cases} | ${x.avg.toFixed(3)} | ${x.ge2} | ${x.ge3} | ${x.ge4} | ${x.ge5} | ${x.ge6} | ${x.status} |\n`
out+='\n## Promotion gate\n\nDISCOVERED/CANDIDATE non significa validato. Il sistema deve congelare la definizione del contesto, riservare un periodo OOS non usato per la discovery e confrontare il candidato con un null condizionato. Solo un OOS positivo può diventare OOS_PASS. I risultati negativi restano nel registro e non vengono cancellati.\n'

writeFileSync(STATE,JSON.stringify(db,null,2))
writeFileSync(REPORT,out)
console.log(out)
