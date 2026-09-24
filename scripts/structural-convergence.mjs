import { generateTopSestine } from '../src/engine/multigen.js'
import { rankedCandidates } from '../src/engine/scoring.js'
import draws from '../src/data/draws.js'
import { writeFileSync } from 'node:fs'

const MODES = [
  {id:'OFF', state:'SPENTA', source:'band'},
  {id:'FAVORISCI', state:'INCLUDI', source:'band'},
  {id:'EVITA', state:'ESCLUDI', source:'band'}
]
const WS = [2,3,4,5]
const AVG_MIN = 12.67, AVG_MAX = 33.83
const TOP_POOL = 15
const FAMILY_SIZE = 10
const STRUCT_SIZE = 10

const nCk=(n,k)=>{if(k<0||k>n)return 0;k=Math.min(k,n-k);let r=1;for(let i=0;i<k;i++)r=r*(n-i)/(i+1);return r}
const deltasOf=ds=>ds.map(d=>{const n=d[2];return [n[1]-n[0],n[2]-n[1],n[3]-n[2],n[4]-n[3],n[5]-n[4]]})
const matchExact=(a,b,t)=>Math.abs(a-b)<=t
const matchProp=(a,b,band)=>{if(a===0&&b===0)return true;if(a===0||b===0)return Math.abs(a-b)<=2;if(Math.sign(a)!==Math.sign(b))return false;const r=b/a;return r>=band[0]&&r<=band[1]}

function trovaAnalogia(ds,W,tolExact=2,propPct=60){
  const band=[Math.max(.01,1-propPct/100),1+propPct/100]
  const allD=deltasOf(ds),N=allD.length
  if(N<2*W+1)return null
  return [0,1,2,3,4].map(idx=>{
    const cur=allD.slice(N-W,N).map(d=>d[idx]),matches=[]
    for(let i=0;i+W<=N-W;i++){
      let ok=true
      for(let k=0;k<W;k++){const c=allD[i+k][idx];if(!(matchExact(c,cur[k],tolExact)||matchProp(c,cur[k],band))){ok=false;break}}
      if(!ok)continue
      const nextDelta=allD[i+W][idx],lastDelta=allD[i+W-1][idx]
      let cls
      if(matchExact(nextDelta,lastDelta,tolExact)||matchProp(nextDelta,lastDelta,band))cls='simile'
      else if(nextDelta<lastDelta)cls='piu_piccolo'
      else cls='piu_grande'
      matches.push({nextDelta,cls})
    }
    const n=matches.length,p=c=>n?matches.filter(m=>m.cls===c).length/n:0
    const simile=p('simile'), piccolo=p('piu_piccolo'), grande=p('piu_grande'), diverso=piccolo+grande
    let target=null
    if(n>=5 && diverso>.5 && diverso>simile+.15){
      const sub=grande>=piccolo?'piu_grande':'piu_piccolo'
      const vals=matches.filter(m=>m.cls===sub).map(m=>m.nextDelta).sort((a,b)=>a-b)
      target=vals.length?vals[Math.floor((vals.length-1)/2)]:null
    } else if(n>=5 && simile>.5 && simile>diverso+.15) target=cur[W-1]
    else {
      let trendUp=true,trendDown=true
      for(let k=1;k<W;k++){if(!(cur[k]>cur[k-1]))trendUp=false;if(!(cur[k]<cur[k-1]))trendDown=false}
      if(trendUp) target=Math.max(1,Math.min(89,cur[W-1]+(cur[W-1]-cur[W-2])))
      else if(trendDown) target=Math.max(1,cur[W-1]-(cur[W-2]-cur[W-1]))
    }
    return target
  })
}

function rng(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>{s=s*16807%2147483647;return(s-1)/2147483646}}
function intuitoFamilies(history,W){
  const targets=trovaAnalogia(history,W)
  if(!targets)return[]
  const perPos=[0,1,2,3,4,5].map(p=>rankedCandidates(history,p))
  const rankOf=perPos.map(r=>new Map(r.map((x,i)=>[x[0],i+1])))
  const R=rng(history.length*1009+W*7919)
  const seen=new Set(),out=[]
  for(let a=0;a<FAMILY_SIZE*60&&out.length<FAMILY_SIZE;a++){
    const s=[];let prev=0,ok=true
    for(let p=0;p<6;p++){
      const cands=perPos[p].filter(r=>r[0]>prev&&!s.includes(r[0]))
      if(!cands.length){ok=false;break}
      const t=p===0?null:targets[p-1]
      let chosen
      if(t==null){
        const idx=a===0?0:Math.min(cands.length-1,Math.floor(R()*R()*4))
        chosen=cands[idx]
      }else{
        const wd=cands.map(r=>({r,d:Math.abs((r[0]-prev)-t)})).sort((x,y)=>x.d-y.d)
        const idx=a===0?0:Math.min(wd.length-1,Math.floor(R()*3))
        chosen=wd[idx].r
      }
      s.push(chosen[0]);prev=chosen[0]
    }
    if(ok&&s.length===6){const key=s.join(',');if(!seen.has(key)){seen.add(key);out.push(s)}}
  }
  return out
}

function familyStates(state){return Array(6).fill(null).map(()=>({stato:state,banda:0,v6:0,vSettPrec:0}))}
function key6(a){return a.join(',')}
function key5(a){let best=[];for(let i=0;i<6;i++)best.push(a.filter((_,j)=>j!==i).join(','));return best}
function initSeen(ds){
  const s6=new Set(),s5=new Set()
  for(const d of ds){const a=[...d[2]].sort((a,b)=>a-b);s6.add(key6(a));for(const k of key5(a))s5.add(k)}
  return{s6,s5}
}
function isDup(a,seen){
  const s=[...a].sort((x,y)=>x-y)
  if(seen.s6.has(key6(s)))return true
  return key5(s).some(k=>seen.s5.has(k))
}

function familiesFor(history){
  const fam=[]
  for(const m of MODES){
    const states=familyStates(m.state)
    const xs=generateTopSestine(history,FAMILY_SIZE,{statiBandaDominante:states})
    fam.push({id:m.id,source:m.source,sets:xs.map(x=>x.numeri)})
  }
  for(const W of WS) fam.push({id:'W'+W,source:'intuito',sets:intuitoFamilies(history,W)})
  return fam
}

function convergence(history,fams){
  const fullRanks=[0,1,2,3,4,5].map(p=>rankedCandidates(history,p))
  const rankMap=fullRanks.map(r=>new Map(r.map((x,i)=>[x[0],i+1])))
  const famSet=new Map(), role=new Map(), source=new Map()
  for(const f of fams){
    for(const s of f.sets){
      for(let p=0;p<6;p++){
        const n=s[p]
        if(!famSet.has(n))famSet.set(n,new Set())
        famSet.get(n).add(f.id)
        if(!role.has(n))role.set(n,new Array(6).fill(0))
        role.get(n)[p]++
        if(!source.has(n))source.set(n,new Set())
        source.get(n).add(f.source)
      }
    }
  }
  const nums=[...famSet.keys()].sort((a,b)=>{
    const fa=famSet.get(a).size,fb=famSet.get(b).size
    if(fa!==fb)return fb-fa
    const sa=source.get(a).size,sb=source.get(b).size
    if(sa!==sb)return sb-sa
    return a-b
  }).slice(0,TOP_POOL)

  const cand=nums.map(n=>({
    n,f:famSet.get(n).size,src:source.get(n).size,
    roles:role.get(n),ranks:rankMap.map(m=>m.get(n)||99)
  }))
  cand.sort((a,b)=>b.f-a.f||b.src-a.src||a.n-b.n)

  const combos=[]
  function rec(start,picks){
    if(picks.length===6){
      let sumF=0,sumSrc=0,sumRole=0,sumRank=0
      for(let p=0;p<6;p++){const c=cand[picks[p]];sumF+=c.f;sumSrc+=c.src;sumRole+=c.roles[p];sumRank+=c.ranks[p]}
      const avg=sumRank/6
      if(avg>=AVG_MIN&&avg<=AVG_MAX){
        const nums=picks.map(i=>cand[i].n)
        const score=sumF*100+sumSrc*10+sumRole
        combos.push({nums,score,sumF,sumSrc,sumRole,avg})
      }
      return
    }
    for(let i=start;i<cand.length-(6-picks.length)+1;i++)rec(i+1,[...picks,i])
  }
  rec(0,[])
  combos.sort((a,b)=>b.score-a.score||a.avg-b.avg)
  const seen=new Set(),out=[]
  for(const c of combos){
    const k=key6(c.nums)
    if(!seen.has(k)){seen.add(k);out.push(c)}
    if(out.length>=STRUCT_SIZE)break
  }
  return {top:cand,sets:out}
}

function hits(set,real){const r=new Set(real);return set.filter(n=>r.has(n)).length}
function distSummary(rows){
  const d=[0,0,0,0,0,0,0];for(const r of rows)d[r]++
  return d
}
function stats(rows){
  const n=rows.length||1
  return {n,mean:rows.reduce((a,b)=>a+b,0)/n,ge2:rows.filter(x=>x>=2).length/n,ge3:rows.filter(x=>x>=3).length/n,ge4:rows.filter(x=>x>=4).length/n,ge5:rows.filter(x=>x>=5).length/n,hit6:rows.filter(x=>x===6).length/n,dist:distSummary(rows)}
}

const START=Number(process.env.START||600), END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const rowsBase=[],rowsStruct=[],cover10=[],cover15=[],blockRows=[]
const blockSize=Math.floor((END-START+1)/3)
let total=0
for(let t=START;t<=END;t++){
  const h=draws.slice(0,t), real=draws[t][2]
  const base=generateTopSestine(h,FAMILY_SIZE).map(x=>x.numeri)
  const fams=familiesFor(h)
  const conv=convergence(h,fams)
  let hs=base.map(s=>hits(s,real))
  let ss=conv.sets.map(s=>hits(s.nums,real))
  rowsBase.push(...hs);rowsStruct.push(...ss)
  const top10=conv.top.slice(0,10).map(x=>x.n),top15=conv.top.slice(0,15).map(x=>x.n)
  cover10.push(hits(top10,real));cover15.push(hits(top15,real))
  total++
  if(total%100===0)console.log('processed',total,'target',t)
}
const B=blockSize
for(let b=0;b<3;b++){
  const lo=b*B,hi=b===2?total:(b+1)*B
  blockRows.push({block:b+1,base:stats(rowsBase.slice(lo*FAMILY_SIZE,hi*FAMILY_SIZE)),struct:stats(rowsStruct.slice(lo*STRUCT_SIZE,hi*STRUCT_SIZE)),cover10:stats(cover10.slice(lo,hi)),cover15:stats(cover15.slice(lo,hi))})
}
const report=[
'# SONAR structural convergence backtest — 24/09/2026',
'',
`Target causale: ${START}–${END} (${total} estrazioni). Per ogni target: 3 famiglie banda (OFF/FAVORISCI/EVITA) × 10 sestine + Intuito W2/W3/W4/W5 × 10. Nessun dato post-target.`,
'',
'## Regola di convergenza congelata',
'- priorità 1: numero presente in più famiglie distinte;',
'- priorità 2: presenza in entrambi i tipi di fonte (banda + intuito);',
'- priorità 3: coerenza di ruolo P1–P6;',
'- costruzione: top 15 numeri strutturali → combinazioni crescenti → vincolo rank medio storico 12.67–33.83 → top 10 sestine per convergenza.',
'',
`## Totale — baseline SONAR 10 sestine vs convergenza 10 sestine`,
`Baseline: mean ${stats(rowsBase).mean.toFixed(4)} · ≥2 ${(100*stats(rowsBase).ge2).toFixed(2)}% · ≥3 ${(100*stats(rowsBase).ge3).toFixed(2)}% · ≥4 ${(100*stats(rowsBase).ge4).toFixed(2)}% · ≥5 ${(100*stats(rowsBase).ge5).toFixed(2)}% · 6 ${(100*stats(rowsBase).hit6).toFixed(2)}%`,
`Convergenza: mean ${stats(rowsStruct).mean.toFixed(4)} · ≥2 ${(100*stats(rowsStruct).ge2).toFixed(2)}% · ≥3 ${(100*stats(rowsStruct).ge3).toFixed(2)}% · ≥4 ${(100*stats(rowsStruct).ge4).toFixed(2)}% · ≥5 ${(100*stats(rowsStruct).ge5).toFixed(2)}% · 6 ${(100*stats(rowsStruct).hit6).toFixed(2)}%`,
`Candidate-set top10: mean captured ${stats(cover10).mean.toFixed(4)} / 6`,
`Candidate-set top15: mean captured ${stats(cover15).mean.toFixed(4)} / 6`,
'',
'## Blocchi cronologici',
...blockRows.map(x=>`B${x.block}: base mean ${x.base.mean.toFixed(4)}, ≥2 ${(100*x.base.ge2).toFixed(2)}%; struct mean ${x.struct.mean.toFixed(4)}, ≥2 ${(100*x.struct.ge2).toFixed(2)}%; top10 capture ${x.cover10.mean.toFixed(3)}; top15 ${x.cover15.mean.toFixed(3)}.`),
'',
'## Distribuzioni 0–6',
`Base ${stats(rowsBase).dist.join(',')}`,
`Struct ${stats(rowsStruct).dist.join(',')}`,
'',
'Interpretazione: questo è un test walk-forward della costruzione strutturale. Non autorizza da solo una modifica della produzione; il punto decisivo è la stabilità tra blocchi e il confronto con il generatore SONAR attuale.'
].join('\n')
writeFileSync('SONAR_structural_convergence_backtest_24settembre2026.md',report)
console.log(report)
