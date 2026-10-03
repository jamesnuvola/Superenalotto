import rawDraws from '../src/data/draws.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const START=Math.max(300,Number(process.env.START||2700)), END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const STATE='SONAR_superenalotto_research_state.json', REPORT='SONAR_superenalotto_autonomous_research_report.md'
const BUDGET=Number(process.env.BUDGET||16), HIGH_HIT=Number(process.env.HIGH_HIT||3)
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0), high=d=>d[2].filter(n=>n>=46).length, odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length, hit=(a,b)=>a.filter(n=>b.includes(n)).length
const context=(h,lookback=21)=>{const w=h.slice(-lookback),s=w.map(sum),hi=w.map(high),od=w.map(odd),rp=w.slice(1).map((d,i)=>repeat(w[i],d));const hist=[];for(let j=lookback;j<h.length;j++)hist.push(h.slice(j-lookback,j).reduce((z,d)=>z+sum(d),0));return {sum:mean(s)>=(hist.length?median(hist):mean(s))?'HIGH':'LOW',highnum:mean(hi)>=3?'HIGH':'LOW',odd:mean(od)>=3?'HIGH':'LOW',repeat:mean(rp)>=.5?'HIGH':'LOW',values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}}}
const signature=(h,real)=>({context:context(h),trajectory:h.slice(-5).map(d=>({sum:sum(d),high:high(d),odd:odd(d)})),target:{sum:sum({2:real}),high:high({2:real}),odd:odd({2:real})}})
const defs=[]
for(const feature of ['sum','highnum','odd','repeat'])for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES)defs.push({id:`${feature}:${polarity}:${strat}`,feature,polarity,strat})
let db={version:3,created:'2026-10-03',origin:'VINCI CASA',target:'SUPERENALOTTO',tested:[],findings:[],queue:defs.map(x=>x.id)}
if(existsSync(STATE))try{db={...db,...JSON.parse(readFileSync(STATE,'utf8')),origin:'VINCI CASA',target:'SUPERENALOTTO'}}catch{}
const done=new Set(db.tested.map(x=>x.id)), pending=defs.filter(x=>!done.has(x.id)).slice(0,BUDGET)
for(const c of pending){const cases=[],highCases=[],complements=[]
 for(let i=START;i<=END;i++){const h=draws.slice(0,i),s=context(h),real=draws[i][2];if(s[c.feature]!==c.polarity)continue;const ticket=strategy(h,c.strat);if(!ticket)continue;const k=hit(ticket,real),sig=signature(h,real);cases.push({i,date:draws[i][0],ticket,hits:k,target:real,signature:sig});if(k>=HIGH_HIT)highCases.push(cases.at(-1))
  if(k>=HIGH_HIT&&k<6){const residual=real.filter(n=>!ticket.includes(n));const best=[];for(const alt of STRATEGIES.filter(x=>x!==c.strat)){const t2=strategy(h,alt);best.push({strategy:alt,hits:hit(t2,residual),residualHits:hit(t2,real)})}best.sort((a,b)=>b.hits-a.hits||b.residualHits-a.residualHits);complements.push({i,date:draws[i][0],base:c.strat,baseHits:k,residual,best:best.slice(0,3)})}
 }
 const six=cases.filter(x=>x.hits===6), five=cases.filter(x=>x.hits===5), four=cases.filter(x=>x.hits===4)
 db.tested.push({id:c.id,range:[START,END],cases:cases.length,ge3:highCases.length,ge4:four.length,ge5:five.length,ge6:six.length,status:'DISCOVERED'})
 db.findings.push({id:c.id,context:c,cases:cases.filter(x=>x.hits>=HIGH_HIT).slice(0,24),complements:complements.slice(0,24),status:'DISCOVERED'})
}
db.lastRun={at:new Date().toISOString(),origin:'VINCI CASA',target:'SUPERENALOTTO',range:[START,END],budget:BUDGET,remaining:defs.length-db.tested.length}
writeFileSync(STATE,JSON.stringify(db,null,2))
let out=`# SONAR — Autonomous SuperEnalotto Research Engine\n\nOrigin/lab: **VinciCasa**\nTarget dataset: **SuperEnalotto**\nRun: ${db.lastRun.at}\nTarget window: ${draws[START][0]} → ${draws[END][0]}\nNodi processati: ${pending.length}\nNodi residui: ${db.lastRun.remaining}\n\n`
out+='## Regola metodologica\n\nIl motore non cerca una regola universale e non promuove una strategia sulla sola media. Ogni nodo è **contesto → strategia → evento**. Gli eventi con ≥3 hit vengono conservati; per 4/5 hit viene inoltre calcolato il residuo e cercata la strategia complementare che copre quel residuo. Il 6/6 è registrato come evento speciale.\n\n'
out+='## Nodi processati\n\n| Nodo | Casi | ≥3 | ≥4 | ≥5 | 6/6 | Stato |\n|---|---:|---:|---:|---:|---:|---|\n'
for(const x of db.tested.slice(-pending.length))out+=`| ${x.id} | ${x.cases} | ${x.ge3} | ${x.ge4} | ${x.ge5} | ${x.ge6} | ${x.status} |\n`
out+='\n## Promozione\n\nDISCOVERED non significa validato. Un candidato passa a FROZEN solo quando la definizione è congelata; quindi deve affrontare OOS e null condizionato nello stesso contesto. Solo dopo può essere marcato OOS_PASS. I fallimenti restano nel registro e non vengono cancellati.\n'
writeFileSync(REPORT,out);console.log(out)
