import draws from '../src/data/draws.js'
import { writeFileSync } from 'node:fs'

const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const pct=(a,k)=>a.length?a.filter(x=>x>=k).length/a.length*100:0
const hit=(ticket,real)=>ticket.filter(n=>real.includes(n)).length
const baseline={mean:0.4,ge1:34.7138,ge2:4.9631,ge3:0.3642}
const month=d=>d[0].slice(3).split('/').reverse().join('-')
const nums=()=>Array.from({length:90},(_,i)=>i+1)

function freqScore(h,w){const c=new Map(nums().map(n=>[n,0]));for(const d of h.slice(-w))for(const n of d[2])c.set(n,c.get(n)+1);return c}
function gapData(h){const occ=new Map(nums().map(n=>[]));h.forEach((d,i)=>d[2].forEach(n=>occ.get(n).push(i)));return occ}
function returnScore(h){
  const occ=gapData(h), out=new Map()
  for(const n of nums()){
    const a=occ.get(n), g=a.length?a.length===1?h.length-a[0]:h.length-1-a[a.length-1]:h.length
    const gaps=[];for(let i=1;i<a.length;i++)gaps.push(a[i]-a[i-1])
    if(gaps.length<5){out.set(n,0);continue}
    const bw=Math.max(2,Math.round(Math.sqrt(mean(gaps))))
    let s=0,den=0
    for(const x of gaps){const w=Math.exp(-((g-x)**2)/(2*bw*bw));s+=w;den+=w}
    out.set(n,den? s/den : 0)
  }
  return out
}
function trendScore(h){
  const f7=freqScore(h,7),f14=freqScore(h,14),f21=freqScore(h,21),out=new Map()
  for(const n of nums()){
    const r7=f7.get(n)/7,r14=f14.get(n)/14,r21=f21.get(n)/21
    const accel=r7-r21
    const recent=Math.max(0,Math.min(1,.5+accel*7.5))
    const level=Math.max(0,Math.min(1,r21/.12))
    const persistence=((r7>0?1:0)+(r14>0?1:0)+(r21>0?1:0))/3
    out.set(n,.45*recent+.35*level+.20*persistence)
  }
  return out
}
function lifecycleScore(h){
  const t=trendScore(h),out=new Map()
  for(const n of nums()){
    const vals=[]
    for(let w of [7,14,21,30]){const f=freqScore(h,w).get(n)/w;vals.push(f)}
    const accel=vals[0]-vals[2], persist=(vals[0]>0?1:0)+(vals[1]>0?1:0)+(vals[2]>0?1:0)
    const score=t.get(n)+.12*Math.max(-1,Math.min(1,accel*8))+.05*(persist/3)
    out.set(n,score)
  }
  return out
}
function positionScores(h){
  const out=Array.from({length:6},()=>new Map(nums().map(n=>[n,0])))
  for(const d of h)d[2].forEach((n,p)=>out[p].set(n,out[p].get(n)+1))
  return out
}
function orderNullScore(p,n){
  // exact order-statistic probability for position p (0-based) under uniform 6/90 draws
  const k=p+1
  const lo=k,hi=90-(6-k)
  if(n<lo||n>hi)return 0
  const c=(a,b)=>{if(b<0||b>a)return 0;let r=1;for(let i=1;i<=b;i++)r=r*(a-b+i)/i;return r}
  return c(n-1,p)*c(90-n,5-p)/c(90,6)
}
function posAdjustedScore(h){
  const ps=positionScores(h),out=Array.from({length:6},()=>new Map())
  for(let p=0;p<6;p++){
    for(const n of nums()){
      const obs=ps[p].get(n), prior=orderNullScore(p,n)
      // empirical lift with light smoothing against order-statistic null
      out[p].set(n,(obs+.5)/(h.length*prior+1))
    }
  }
  return out
}
function nucleusScores(h,i){
  const targetMonth=month(h[i]||h.at(-1)), out=Array.from({length:6},()=>new Map(nums().map(n=>[n,0])))
  const months=[...new Set(h.map(month))].sort(), idx=months.indexOf(targetMonth)
  if(idx<3)return out
  const prev=months.slice(idx-3,idx)
  for(let p=0;p<6;p++){
    for(const n of nums()){
      const ok=prev.every(m=>h.some(d=>month(d)===m&&d[2][p]===n))
      const current=h.slice(0,i).some(d=>month(d)===targetMonth&&d[2][p]===n)
      if(ok&&!current)out[p].set(n,1)
    }
  }
  return out
}
function relationScores(h){
  const pairs=new Map(), triples=new Map(), pos=Array.from({length:6},()=>new Map())
  if(!h.length)return {pairs,triples,pos}
  for(let i=0;i<h.length-1;i++){
    const a=h[i][2],b=h[i+1][2]
    for(let x=0;x<6;x++)for(let y=x+1;y<6;y++){
      const k=a[x]+','+a[y];if(!pairs.has(k))pairs.set(k,new Map());for(const n of b)pairs.get(k).set(n,(pairs.get(k).get(n)||0)+1)
    }
    for(let x=0;x<6;x++)for(let y=x+1;y<6;y++)for(let z=y+1;z<6;z++){
      const k=a[x]+','+a[y]+','+a[z];if(!triples.has(k))triples.set(k,new Map());for(const n of b)triples.get(k).set(n,(triples.get(k).get(n)||0)+1)
    }
    for(let p=0;p<6;p++){const x=a[p],y=b[p];if(!pos[p].has(x))pos[p].set(x,new Map());const m=pos[p].get(x);m.set(y,(m.get(y)||0)+1)}
  }
  const last=h.at(-1)[2],ps=new Map(),ts=new Map(),xs=Array.from({length:6},()=>new Map())
  for(let x=0;x<6;x++)for(let y=x+1;y<6;y++){const m=pairs.get(last[x]+','+last[y]);if(!m)continue;const tot=[...m.values()].reduce((a,b)=>a+b,0);for(const [n,c] of m)ps.set(n,(ps.get(n)||0)+c/tot*Math.sqrt(tot))}
  for(let x=0;x<6;x++)for(let y=x+1;y<6;y++)for(let z=y+1;z<6;z++){const m=triples.get(last[x]+','+last[y]+','+last[z]);if(!m)continue;const tot=[...m.values()].reduce((a,b)=>a+b,0);for(const [n,c] of m)ts.set(n,(ts.get(n)||0)+c/tot*Math.sqrt(tot))}
  for(let p=0;p<6;p++){const m=pos[p].get(last[p]);if(!m)continue;const tot=[...m.values()].reduce((a,b)=>a+b,0);for(const [n,c] of m)xs[p].set(n,c/tot)}
  return {pairs:ps,triples:ts,pos:xs}
}
function rankMap(m){return new Map([...m.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map((x,i)=>[x[0],i+1]))}
function ticketGlobal(score){return [...score.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,6).map(x=>x[0]).sort((a,b)=>a-b)}
function ticketPositions(scores){
  const out=[],ranks=scores.map(rankMap);let prev=0
  for(let p=0;p<6;p++){
    const remain=5-p
    const cand=[...ranks[p].entries()].filter(([n])=>n>prev&&n<=90-remain)
    if(!cand.length)return null
    cand.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);const n=cand[0][0];out.push(n);prev=n
  }
  return out
}
function normalize(m){const a=[...m.values()],lo=Math.min(...a),hi=Math.max(...a),out=new Map();for(const n of nums())out.set(n,hi===lo?0:(m.get(n)-lo)/(hi-lo));return out}
function combine(ms,ws){const ns=ms.map(normalize),out=new Map();for(const n of nums())out.set(n,ns.reduce((s,m,i)=>s+m.get(n)*ws[i],0));return out}
function strategy(h,i,name){
  const freq=normalize(freqScore(h,10)),ret=normalize(returnScore(h)),trend=normalize(trendScore(h)),life=normalize(lifecycleScore(h))
  const rel=relationScores(h),pos=posAdjustedScore(h),nuc=nucleusScores(h,i)
  if(name==='FREQUENCY')return ticketGlobal(freq)
  if(name==='RETURN')return ticketGlobal(ret)
  if(name==='TREND')return ticketGlobal(trend)
  if(name==='LIFECYCLE')return ticketGlobal(life)
  if(name==='NUCLEUS')return ticketPositions(nuc)
  if(name==='RELATION'){
    const s=Array.from({length:6},(_,p)=>new Map(nums().map(n=>[n,(rel.pairs.get(n)||0)*.65+(rel.triples.get(n)||0)*.2+(rel.pos[p].get(n)||0)*.15])))
    return ticketPositions(s)
  }
  if(name==='POSITION')return ticketPositions(pos)
  if(name==='BALANCED'){
    const s=Array.from({length:6},(_,p)=>new Map(nums().map(n=>.35*(nuc[p].get(n)||0)+.30*(rel.pairs.get(n)||0)+.10*(rel.triples.get(n)||0)+.15*(rel.pos[p].get(n)||0)+.10*freq.get(n))))
    return ticketPositions(s)
  }
  if(name==='TREND+RELATION')return ticketGlobal(combine([trend,normalize(rel.pairs)], [.5,.5]))
  if(name==='TREND+LIFE')return ticketGlobal(combine([trend,life],[.7,.3]))
  if(name==='FREQ+RETURN')return ticketGlobal(combine([freq,ret],[.5,.5]))
  if(name==='REGIME_TREND'){
    const recent=h.slice(-21),sum=mean(recent.map(d=>d[2].reduce((a,b)=>a+b,0))),high=mean(recent.map(d=>d[2].filter(n=>n>=46).length))
    const tr=high>=3||sum>=285?trend:life
    return ticketGlobal(tr)
  }
  return null
}
const STRATS=['FREQUENCY','RETURN','TREND','LIFECYCLE','NUCLEUS','RELATION','POSITION','BALANCED','TREND+RELATION','TREND+LIFE','FREQ+RETURN','REGIME_TREND']
const START=Math.max(300,Number(process.env.START||300)),END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const rows=Object.fromEntries(STRATS.map(s=>[s,[]]))
const byBlock=Object.fromEntries(STRATS.map(s=>[s,[]]))
for(let i=START;i<=END;i++){
  const h=draws.slice(0,i),real=draws[i][2]
  for(const s of STRATS){const t=strategy(h,i,s);rows[s].push(t?hit(t,real):0)}
}
const n=END-START+1
for(const s of STRATS){const a=rows[s];const third=Math.floor(a.length/3);byBlock[s]=[a.slice(0,third),a.slice(third,2*third),a.slice(2*third)]}
const result={dataset:{draws:draws.length,start:draws[START][0],end:draws[END][0],targets:n},baseline,strategies:{}}
for(const s of STRATS){result.strategies[s]={overall:{mean:mean(rows[s]),ge1:pct(rows[s],1),ge2:pct(rows[s],2),ge3:pct(rows[s],3),ge4:pct(rows[s],4),ge5:pct(rows[s],5),hit6:pct(rows[s],6)},blocks:byBlock[s].map(a=>({n:a.length,mean:mean(a),ge2:pct(a,2),ge3:pct(a,3)}))}}
let out='# SONAR — VinciCasa → SuperEnalotto port test\n\n'
out+=`Dataset: ${draws.length} estrazioni, target ${draws[START][0]} → ${draws[END][0]} (${n} target). Tutti i segnali usano solo il prefisso precedente al target.\n\n`
out+='## Baseline casuale 6/90\n\n- hit medi: 0.400\n- P(≥1): 34.714%\n- P(≥2): 4.963%\n- P(≥3): 0.364%\n\n'
out+='## Risultati\n\n| Strategia | Hit medi | ≥1 | ≥2 | ≥3 | ≥4 | ≥5 | 6 | B1 | B2 | B3 |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n'
for(const s of STRATS){const r=result.strategies[s].overall,b=result.strategies[s].blocks;out+=`| ${s} | ${r.mean.toFixed(3)} | ${r.ge1.toFixed(1)}% | ${r.ge2.toFixed(1)}% | ${r.ge3.toFixed(1)}% | ${r.ge4.toFixed(2)}% | ${r.ge5.toFixed(3)}% | ${r.hit6.toFixed(3)}% | ${b[0].mean.toFixed(3)} | ${b[1].mean.toFixed(3)} | ${b[2].mean.toFixed(3)} |\n`}
out+='\n## Nota metodologica\n\nIl test misura densità di hit, non dimostra capacità predittiva. Le strategie sono portate nel dominio 6/90 con parametri riscalati dove necessario. Nessun risultato entra nel motore ufficiale. Le strategie che mostrano un vantaggio apparente devono passare un secondo test OOS congelato e confronto con null condizionato.\n'
writeFileSync('SONAR_vincicasa_port_superenalotto_2026-10-02.md',out)
console.log(out)
