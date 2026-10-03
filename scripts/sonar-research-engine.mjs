import rawDraws from '../src/data/draws.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const WINDOW=Number(process.env.WINDOW||228), MIN_START=Math.max(300,Number(process.env.MIN_START||300))
const STATE='SONAR_superenalotto_research_state.json', REPORT='SONAR_superenalotto_autonomous_research_report.md'
const BUDGET=Number(process.env.BUDGET||16), HIGH_HIT=Number(process.env.HIGH_HIT||3)
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0), high=d=>d[2].filter(n=>n>=46).length, odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length, hit=(a,b)=>a.filter(n=>b.includes(n)).length
const context=(h,lookback=21)=>{const w=h.slice(-lookback),s=w.map(sum),hi=w.map(high),od=w.map(odd),rp=w.slice(1).map((d,i)=>repeat(w[i],d));const hist=[];for(let j=lookback;j<h.length;j++)hist.push(h.slice(j-lookback,j).reduce((z,d)=>z+sum(d),0));return {sum:mean(s)>=(hist.length?median(hist):mean(s))?'HIGH':'LOW',highnum:mean(hi)>=3?'HIGH':'LOW',odd:mean(od)>=3?'HIGH':'LOW',repeat:mean(rp)>=.5?'HIGH':'LOW',values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}}}
const signature=(h,real)=>({context:context(h),trajectory:h.slice(-5).map(d=>({sum:sum(d),high:high(d),odd:odd(d)})),target:{sum:real.reduce((a,b)=>a+b,0),high:real.filter(n=>n>=46).length,odd:real.filter(n=>n%2).length}})
const defs=[]
for(const feature of ['sum','highnum','odd','repeat'])for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES)defs.push({feature,polarity,strat})
const taskId=(end,c)=>`e${end}:${c.feature}:${c.polarity}:${c.strat}`
const tasks=[]
for(let end=END;end>=MIN_START;end-=WINDOW){for(const c of defs)tasks.push({...c,start:Math.max(MIN_START,end-WINDOW+1),end,id:taskId(end,c)})}
let db={version:4,created:'2026-10-03',origin:'VINCI CASA',target:'SUPERENALOTTO',tested:[],findings:[],queue:[]}
if(existsSync(STATE))try{db={...db,...JSON.parse(readFileSync(STATE,'utf8')),origin:'VINCI CASA',target:'SUPERENALOTTO'}}catch{}
// Migrate the first-generation queue so the completed latest window is not repeated.
db.tested=(db.tested||[]).map(x=>x.id?.startsWith('e')?x:{...x,id:`e${x.range?.[1]??2927}:${x.id}`})
db.findings=db.findings||[]
const done=new Set(db.tested.map(x=>x.id)),pending=tasks.filter(x=>!done.has(x.id)).slice(0,BUDGET)
for(const c of pending){const cases=[],highCases=[],complements=[]
 for(let i=c.start;i<=c.end;i++){const h=draws.slice(0,i),s=context(h),real=draws[i][2];if(s[c.feature]!==c.polarity)continue;const ticket=strategy(h,c.strat);if(!ticket)continue;const k=hit(ticket,real),sig=signature(h,real);cases.push({i,date:draws[i][0],ticket,hits:k,target:real,signature:sig});if(k>=HIGH_HIT)highCases.push(cases.at(-1));if(k>=HIGH_HIT&&k<6){const residual=real.filter(n=>!ticket.includes(n)),best=[];for(const alt of STRATEGIES.filter(x=>x!==c.strat)){const t2=strategy(h,alt);best.push({strategy:alt,hits:hit(t2,residual),residualHits:hit(t2,real)})}best.sort((a,b)=>b.hits-a.hits||b.residualHits-a.residualHits);complements.push({i,date:draws[i][0],base:c.strat,baseHits:k,residual,best:best.slice(0,3)})}}
 const six=cases.filter(x=>x.hits===6),five=cases.filter(x=>x.hits===5),four=cases.filter(x=>x.hits===4)
 db.tested.push({id:c.id,range:[c.start,c.end],cases:cases.length,ge3:highCases.length,ge4:four.length,ge5:five.length,ge6:six.length,status:'DISCOVERED'})
 db.findings.push({id:c.id,context:{feature:c.feature,polarity:c.polarity,strategy:c.strat},range:[c.start,c.end],cases:cases.filter(x=>x.hits>=HIGH_HIT).slice(0,24),complements:complements.slice(0,24),status:'DISCOVERED'})
}
const remaining=tasks.length-db.tested.filter(x=>tasks.some(t=>t.id===x.id)).length
const currentTask=pending[0]
db.queue={type:'PERSISTENT_DOT_QUEUE',total:tasks.length,completed:tasks.length-remaining,next:currentTask?.id||null,remaining}
db.lastRun={at:new Date().toISOString(),origin:'VINCI CASA',target:'SUPERENALOTTO',range:currentTask?[currentTask.start,currentTask.end]:null,budget:BUDGET,processed:pending.length,remaining}
writeFileSync(STATE,JSON.stringify(db,null,2))
let out=`# SONAR — Autonomous SuperEnalotto Research Engine\n\nOrigin/lab: **VinciCasa**\nTarget dataset: **SuperEnalotto**\nRun: ${db.lastRun.at}\nDOT agents processed: ${pending.length}\nDOT agents remaining: ${remaining}\nNext DOT: ${currentTask?.id||'WAITING_FOR_NEW_DATA'}\n\n`
out+='## Persistent DOT model\n\nEach DOT is a persistent research agent identified by **historical window + context + strategy**. A completed DOT is never silently repeated. The queue advances through the latest window and then progressively older windows, preserving every result. A new draw creates a new latest-window frontier without deleting previous work.\n\n'
out+='## Nodi processati\n\n| DOT | Finestra | Casi | ≥3 | ≥4 | ≥5 | 6/6 | Stato |\n|---|---|---:|---:|---:|---:|---:|---|\n'
for(const x of db.tested.slice(-pending.length))out+=`| ${x.id} | ${x.range[0]}–${x.range[1]} | ${x.cases} | ${x.ge3} | ${x.ge4} | ${x.ge5} | ${x.ge6} | ${x.status} |\n`
out+='\n## Regola metodologica\n\nUn DOT non dimostra una regola universale. I risultati ≥3 hit vengono conservati per cercare contesti simili e ripetibili; i 4/5 hit generano analisi del residuo e strategie complementari. DISCOVERED non significa validato: la promozione richiede definizione congelata, OOS e null condizionato. I fallimenti restano nel registro.\n'
writeFileSync(REPORT,out)
console.log(out)