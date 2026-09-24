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

function shapeOf(a){
  const odd=a.filter(n=>n%2).length
  const decades=new Set(a.map(n=>Math.floor((n-1)/10))).size
  const gaps=[];for(let i=1;i<a.length;i++)gaps.push(a[i]-a[i-1])
  const small=gaps.filter(g=>g<=5).length
  const large=gaps.filter(g>=15).length
  return {odd,decades,small,large,gaps}
}
function roleConcentration(x){const s=x.roles.reduce((a,b)=>a+b,0)||1;return Math.max(...x.roles)/s}
function convergence(history,fams,opts={}){
  const seen=initSeen(history)
  const fullRanks=[0,1,2,3,4,5].map(p=>rankedCandidates(history,p))
  const rankMap=fullRanks.map(r=>new Map(r.map((x,i)=>[x[0],i+1])))
  const famSet=new Map(), role=new Map(), source=new Map()
  for(const f of fams){
    if(opts.ids && !opts.ids.has(f.id)) continue
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
  const eligible=[...famSet.keys()].filter(n=>!opts.minFamilies || famSet.get(n).size>=opts.minFamilies).filter(n=>!opts.requireBoth || source.get(n).size===2).sort((a,b)=>{
    const fa=famSet.get(a).size,fb=famSet.get(b).size
    if(fa!==fb)return fb-fa
    const sa=source.get(a).size,sb=source.get(b).size
    if(sa!==sb)return sb-sa
    return a-b
  })
  const nums=eligible.slice(0,TOP_POOL)


  const cand=nums.map(n=>({
    scoreFamily:famSet.get(n).size,
    scoreSource:source.get(n).size,
    scoreIntuito:[...famSet.get(n)].filter(x=>x[0]==='W').length,
    scoreBand:[...famSet.get(n)].filter(x=>x==='FAVORISCI').length-[...famSet.get(n)].filter(x=>x==='EVITA').length,
    n,f:famSet.get(n).size,src:source.get(n).size,
    roles:role.get(n),ranks:rankMap.map(m=>m.get(n)||99)
  }))
  const mode=opts.scoreMode||'family'
  const value=x=>{
    if(mode==='family') return x.f*100+x.src*10
    if(mode==='source') return x.src*100+x.f*10
    if(mode==='intuito') return x.scoreIntuito*100+x.f*10+x.src
    if(mode==='balanced') return x.f*50+x.src*30+x.scoreIntuito*20+x.scoreBand*10
    if(mode==='favorisci') return x.scoreBand*100+x.f*20+x.src*10
    if(mode==='cross') return (x.src===2?100:0)+x.scoreIntuito*30+x.f*20+x.scoreBand*10
    if(mode==='role') return x.f*40+x.src*25+x.scoreIntuito*15+x.scoreBand*5+roleConcentration(x)*100
    if(mode==='roleShape') return x.f*40+x.src*25+x.scoreIntuito*15+x.scoreBand*5+roleConcentration(x)*100
    if(mode==='shape') return x.f*30+x.src*20+x.scoreIntuito*10+x.scoreBand*5
    return x.f*100+x.src*10
  }
  cand.sort((a,b)=>value(b)-value(a)||b.f-a.f||a.n-b.n)

  const combos=[]
  function rec(start,picks){
    if(picks.length===6){
      let sumF=0,sumSrc=0,sumRole=0,sumRank=0
      for(let p=0;p<6;p++){const c=cand[picks[p]];sumF+=c.f;sumSrc+=c.src;sumRole+=c.roles[p];sumRank+=c.ranks[p]}
      const avg=sumRank/6
      if(avg>=AVG_MIN&&avg<=AVG_MAX){
        const nums=picks.map(i=>cand[i].n)
        if(isDup(nums,seen)) return
        const sh=shapeOf(nums)
        const roleScore=picks.reduce((s,i)=>s+roleConcentration(cand[i]),0)
        let shapeScore=0
        if(mode==='roleShape' || mode==='shape'){
          // Soft structural shape preference: favor historically common parity/decade/gap morphology.
          const targetOdd=3, targetDec=5, targetSmall=2, targetLarge=1
          shapeScore=20*Math.abs(sh.odd-targetOdd)*-1+10*Math.abs(sh.decades-targetDec)*-1+8*Math.abs(sh.small-targetSmall)*-1+5*Math.abs(sh.large-targetLarge)*-1
        }
        const score=sumF*100+sumSrc*10+sumRole+roleScore*20+shapeScore
        combos.push({nums,score,sumF,sumSrc,sumRole,avg,shape:sh,roleScore})
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
const variants=[
  {id:'ALL',opts:{scoreMode:'family'}},
  {id:'BALANCED',opts:{scoreMode:'balanced'}},
  {id:'CROSS',opts:{scoreMode:'cross'}},
  {id:'INTUITO',opts:{scoreMode:'intuito'}},
  {id:'FAVORISCI',opts:{scoreMode:'favorisci'}},
  {id:'SOURCE',opts:{scoreMode:'source'}},
  {id:'BOTH_BAL',opts:{scoreMode:'balanced',requireBoth:true}},
  {id:'FAM2_BAL',opts:{scoreMode:'balanced',minFamilies:2}},
  {id:'BAND',opts:{ids:new Set(['OFF','FAVORISCI','EVITA']),scoreMode:'balanced'}},
  {id:'INT_ONLY',opts:{ids:new Set(['W2','W3','W4','W5']),scoreMode:'balanced'}},
  {id:'ROLE',opts:{scoreMode:'role'}},
  {id:'ROLE_SHAPE',opts:{scoreMode:'roleShape'}},
  {id:'SHAPE',opts:{scoreMode:'shape'}}
]
const results=Object.fromEntries(variants.map(v=>[v.id,{base:[],struct:[],cover10:[],cover15:[]}]))
const blockSize=Math.floor((END-START+1)/3)
let total=0
for(let t=START;t<=END;t++){
  const h=draws.slice(0,t),real=draws[t][2]
  const base=generateTopSestine(h,FAMILY_SIZE).map(x=>x.numeri)
  const fams=familiesFor(h)
  for(const v of variants){
    const conv=convergence(h,fams,v.opts)
    const hs=base.map(s=>hits(s,real))
    const ss=conv.sets.map(s=>hits(s.nums,real))
    results[v.id].base.push(...hs)
    results[v.id].struct.push(...ss)
    results[v.id].cover10.push(hits(conv.top.slice(0,10).map(x=>x.n),real))
    results[v.id].cover15.push(hits(conv.top.slice(0,15).map(x=>x.n),real))
  }
  total++
  if(total%100===0)console.log('processed',total,'target',t)
}
function blockStats(rows,block){
  const lo=block*blockSize,hi=block===2?total:(block+1)*blockSize
  return stats(rows.slice(lo,hi))
}
const lines=[
'# SONAR structural convergence ablation — 24/09/2026','',
`Target causale: ${START}–${END} (${total} estrazioni). Stesse 3 bande + Intuito W2-W5 per ogni target; nessun dato post-target.`,'',
'Varianti: family count, balanced, cross-source, Intuito density, FAVORISCI, source diversity, filtri BOTH/FAM2/BAND/INT_ONLY, più ROLE/ROLE_SHAPE/SHAPE. Tutte le sestine strutturali ora escludono esplicitamente sestine e cinquine già uscite.',
''
]
for(const v of variants){
  const z=results[v.id]
  const ss=stats(z.struct),c10=stats(z.cover10),c15=stats(z.cover15)
  lines.push(`## ${v.id}`)
  lines.push(`mean ${ss.mean.toFixed(4)} · ≥2 ${(100*ss.ge2).toFixed(2)}% · ≥3 ${(100*ss.ge3).toFixed(2)}% · ≥4 ${(100*ss.ge4).toFixed(2)}% · ≥5 ${(100*ss.ge5).toFixed(2)}% · 6 ${(100*ss.hit6).toFixed(2)}%`)
  lines.push(`top10 capture ${c10.mean.toFixed(4)} / 6 · top15 capture ${c15.mean.toFixed(4)} / 6`)
  lines.push(`dist 0–6: ${ss.dist.join(',')}`)
  for(let b=0;b<3;b++){
    const x=blockStats(z.struct,b),y=blockStats(z.cover15,b)
    lines.push(`B${b+1}: mean ${x.mean.toFixed(4)} · ≥2 ${(100*x.ge2).toFixed(2)}% · top15 ${y.mean.toFixed(3)}`)
  }
  lines.push('')
}
lines.push('Baseline SONAR 10-setine (identico per tutte le varianti):')
const bs=stats(results.ALL.base);lines.push(`mean ${bs.mean.toFixed(4)} · ≥2 ${(100*bs.ge2).toFixed(2)}% · ≥3 ${(100*bs.ge3).toFixed(2)}% · ≥4 ${(100*bs.ge4).toFixed(2)}% · dist ${bs.dist.join(',')}`)
lines.push('')
lines.push('Interpretazione: ablation walk-forward. Nessuna variante viene promossa da sola; cerchiamo stabilità cronologica e valore aggiunto rispetto al generatore attuale.')
const report=lines.join('\\n')
writeFileSync('SONAR_structural_convergence_ablation_24settembre2026.md',report)
console.log(report)
