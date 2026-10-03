import rawDraws from '../src/data/draws.js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { strategy, STRATEGIES } from './sonar-strategy-library.mjs'

const draws=rawDraws.map(d=>[d[0],d[1],Array.isArray(d[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[],d[3]])
const END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const WINDOW=Number(process.env.WINDOW||228), MIN_START=Math.max(300,Number(process.env.MIN_START||300))
const STATE='SONAR_superenalotto_research_state.json', REPORT='SONAR_superenalotto_autonomous_research_report.md'
const BUDGET=Number(process.env.BUDGET||16), FEATURES=['sum','highnum','odd','repeat']
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const median=a=>{const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
const sum=d=>d[2].reduce((a,b)=>a+b,0), high=d=>d[2].filter(n=>n>=46).length, odd=d=>d[2].filter(n=>n%2).length
const repeat=(a,b)=>a[2].filter(n=>b[2].includes(n)).length, hit=(a,b)=>a.filter(n=>b.includes(n)).length

// All context features are now classified against the same unit: individual draws.
// This fixes the previous sum bug (recent single-draw mean vs historical 21-draw totals).
const context=(h,lookback=21)=>{
  const w=h.slice(-lookback), previous=h.slice(0,-lookback)
  const s=w.map(sum), hi=w.map(high), od=w.map(odd), rp=w.slice(1).map((d,i)=>repeat(w[i],d))
  const histS=previous.map(sum), histHi=previous.map(high), histOd=previous.map(odd), histRp=previous.slice(1).map((d,i)=>repeat(previous[i],d))
  const cls=(v,hist)=>v>=(hist.length?median(hist):v)?'HIGH':'LOW'
  return {sum:cls(mean(s),histS),highnum:cls(mean(hi),histHi),odd:cls(mean(od),histOd),repeat:cls(mean(rp),histRp),values:{sum:mean(s),highnum:mean(hi),odd:mean(od),repeat:mean(rp)}}
}
const signature=(h,real)=>({context:context(h),trajectory:h.slice(-5).map(d=>({sum:sum(d),high:high(d),odd:odd(d)})),target:{sum:real.reduce((a,b)=>a+b,0),high:real.filter(n=>n>=46).length,odd:real.filter(n=>n%2).length}})

const defs=[]
for(const feature of FEATURES)for(const polarity of ['HIGH','LOW'])for(const strat of STRATEGIES)defs.push({feature,polarity,strat})
const tasks=[]
for(let end=END;end>=MIN_START;end-=WINDOW){
  const start=Math.max(MIN_START,end-WINDOW+1)
  for(const c of defs)tasks.push({...c,start,end,type:'DISCOVERY',id:`e${end}:${c.feature}:${c.polarity}:${c.strat}`})
  tasks.push({start,end,type:'6HUNTER',id:`e${end}:6HUNTER`})
}

let db={version:5,created:'2026-10-03',origin:'VINCI CASA',target:'SUPERENALOTTO',tested:[],findings:[],spawned:[],sixHunter:[],ruleCards:[],queue:{}}
if(existsSync(STATE))try{db={...db,...JSON.parse(readFileSync(STATE,'utf8')),origin:'VINCI CASA',target:'SUPERENALOTTO'}}catch{}
db.tested=db.tested||[]; db.findings=db.findings||[]; db.spawned=db.spawned||[]; db.sixHunter=db.sixHunter||[]; db.ruleCards=db.ruleCards||[]
db.tested=db.tested.map(x=>x.id?.startsWith('e')?x:{...x,id:`e${x.range?.[1]??END}:${x.id}`})
const done=new Set(db.tested.map(x=>x.id))
const pending=tasks.filter(x=>!done.has(x.id)).slice(0,BUDGET)

for(const c of pending){
  if(c.type==='6HUNTER'){
    const six=[]
    for(let i=c.start;i<=c.end;i++){
      const h=draws.slice(0,i), real=draws[i][2]
      for(const strat of STRATEGIES){const ticket=strategy(h,strat);if(!ticket)continue;if(hit(ticket,real)===6)six.push({i,date:draws[i][0],strategy:strat,ticket,target:real,signature:signature(h,real)})}
    }
    const r={id:c.id,range:[c.start,c.end],type:c.type,count:six.length,six:six.slice(0,100),status:six.length?'FOUND':'NO_DIRECT_6_6'}
    db.tested.push(r);db.sixHunter.push(r);continue
  }
  const cases=[]
  for(let i=c.start;i<=c.end;i++){
    const h=draws.slice(0,i), s=context(h), real=draws[i][2]
    if(s[c.feature]!==c.polarity)continue
    const ticket=strategy(h,c.strat);if(!ticket)continue
    const k=hit(ticket,real);cases.push({i,date:draws[i][0],ticket,hits:k,target:real,signature:signature(h,real)})
  }
  const ge3=cases.filter(x=>x.hits>=3),ge4=cases.filter(x=>x.hits>=4),ge5=cases.filter(x=>x.hits>=5),ge6=cases.filter(x=>x.hits===6)
  db.tested.push({id:c.id,range:[c.start,c.end],type:c.type,cases:cases.length,ge3:ge3.length,ge4:ge4.length,ge5:ge5.length,ge6:ge6.length,status:'DISCOVERED'})
  db.findings.push({id:c.id,context:{feature:c.feature,polarity:c.polarity,strategy:c.strat},range:[c.start,c.end],cases:ge3.slice(0,24),failures:cases.filter(x=>x.hits<3).slice(0,24),status:'DISCOVERED'})
  db.ruleCards.push({key:`${c.feature}:${c.polarity}:${c.strat}`,window:[c.start,c.end],cases:cases.length,ge3:ge3.length,ge4:ge4.length,ge5:ge5.length,ge6:ge6.length,worksWhen:{feature:c.feature,polarity:c.polarity},successExamples:ge3.slice(0,12),failureExamples:cases.filter(x=>x.hits<3).slice(0,12),status:'DISCOVERED'})
  if(ge3.length){const id=`C:${c.id}`;if(!db.spawned.some(x=>x.id===id))db.spawned.push({id,parent:c.id,type:'CONDITION_ANALYSIS',range:[c.start,c.end],feature:c.feature,polarity:c.polarity,strat:c.strat,status:'QUEUED'})}
}

// Child DOTs explain why a discovered rule works only in some cases.
const childDone=new Set(db.tested.filter(x=>x.type==='CONDITION_ANALYSIS').map(x=>x.id))
const childPending=db.spawned.filter(x=>x.status==='QUEUED'&&!childDone.has(x.id)).slice(0,Math.max(0,BUDGET-pending.length))
for(const c of childPending){
  const parent=db.findings.find(x=>x.id===c.parent), successes=parent?.cases||[], failures=[]
  for(let i=c.range[0];i<=c.range[1]&&failures.length<24;i++){
    const h=draws.slice(0,i),s=context(h),real=draws[i][2]
    if(s[c.feature]!==c.polarity)continue
    const t=strategy(h,c.strat);if(!t||hit(t,real)>=3)continue
    failures.push({i,date:draws[i][0],hits:hit(t,real),context:s,signature:signature(h,real)})
  }
  db.findings.push({id:c.id,parent:c.parent,type:c.type,successContexts:successes.map(x=>x.signature.context).slice(0,24),failureContexts:failures,question:'Which additional conditions discriminate successes from failures?',status:'DISCOVERED'})
  db.tested.push({id:c.id,range:c.range,type:c.type,successes:successes.length,failures:failures.length,status:'DISCOVERED'})
  c.status='DONE'
}

const completed=new Set(db.tested.map(x=>x.id))
const remaining=tasks.filter(x=>!completed.has(x.id)).length+db.spawned.filter(x=>x.status==='QUEUED'&&!completed.has(x.id)).length
const next=db.spawned.find(x=>x.status==='QUEUED'&&!completed.has(x.id))||tasks.find(x=>!completed.has(x.id))
db.queue={type:'PERSISTENT_DOT_QUEUE',total:tasks.length+db.spawned.length,completed:completed.size,remaining,next:next?.id||null}
db.lastRun={at:new Date().toISOString(),origin:'VINCI CASA',target:'SUPERENALOTTO',budget:BUDGET,processed:pending.length+childPending.length,remaining,next:next?.id||null,methodology:'conditional-rules + direct-6/6-hunter + failure-analysis'}
writeFileSync(STATE,JSON.stringify(db,null,2))

let out=`# SONAR — Autonomous SuperEnalotto Research Engine\n\nOrigin/lab: **VinciCasa**  \nTarget: **SuperEnalotto**  \nRun: ${db.lastRun.at}  \nDOTs processed: **${db.lastRun.processed}**  \nDOTs remaining: **${remaining}**  \nNext DOT: **${next?.id||'WAITING_FOR_NEW_DATA'}**\n\n`
out+='## Architecture\n\nEach DOT is a persistent research agent. It executes once, stores evidence, and is never silently repeated. New draws create a new latest-window frontier while previous evidence remains.\n\n'
out+='## Parallel tracks\n\n- **Conditional discovery:** find when a rule works and when it fails.\n- **6/6 Hunter:** search historical 6/6 conditions directly, independently of 3/4/5-hit paths.\n- **Condition analysis:** ≥3 findings spawn child DOTs that compare success contexts with nearby failures.\n\n'
out+='## Recent DOTs\n\n| DOT | Type | Window | Cases/Successes | ≥3 | ≥4 | ≥5 | 6/6 | Status |\n|---|---|---|---:|---:|---:|---:|---:|---|\n'
for(const x of db.tested.slice(-(pending.length+childPending.length||1)))out+=`| ${x.id} | ${x.type} | ${x.range?.[0]}–${x.range?.[1]} | ${x.cases??x.successes??x.count??0} | ${x.ge3??'-'} | ${x.ge4??'-'} | ${x.ge5??'-'} | ${x.ge6??x.count??'-'} | ${x.status} |\n`
out+='\n## Methodological rule\n\nA discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.\n\n## 6/6 priority\n\nThe 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.\n'
writeFileSync(REPORT,out)
console.log(out)
