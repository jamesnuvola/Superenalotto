import draws from '../src/data/draws.js'
import { actualRank } from '../src/engine/scoring.js'

const DS=draws.map(d=>({date:d[0],numbers:[...d[2]],raw:d}))
const N=DS.length, START=600
const has1=t=>DS[t].numbers[0]===1
const band=r=>r<=5?'A':r<=10?'B':r<=20?'C':'D'
const ranksAt=t=>DS[t].numbers.map((n,p)=>actualRank(DS.slice(0,t).map(x=>x.raw),p,n).rank)
const setting=t=>ranksAt(t).map(band).join('')
const hits10=t=>ranksAt(t).filter(r=>r<=10).length
const motifs=(t,k)=>DS.slice(t-k,t).map(d=>d.numbers[0]===1?'1':'0').join('')

const rows=[]
for(let t=START;t<N;t++) rows.push({t,s:setting(t),h:hits10(t),m3:motifs(t,3),m5:motifs(t,5),m7:motifs(t,7),one:has1(t)})
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0
const sd=a=>{const m=mean(a);return Math.sqrt(mean(a.map(x=>(x-m)**2)))}
const blocks=[rows.slice(0,Math.floor(rows.length*.4)),rows.slice(Math.floor(rows.length*.4),Math.floor(rows.length*.7)),rows.slice(Math.floor(rows.length*.7))]
const sigStats=(a)=>({n:a.length,meanHits10:mean(a.map(x=>x.h)),rate2:a.filter(x=>x.h>=2).length/a.length,rate3:a.filter(x=>x.h>=3).length/a.length})
const topComb=(a,k)=>{
 const map=new Map()
 for(const r of a){const key=r.m+'|'+r.s;map.set(key,(map.get(key)||[]).concat(r))}
 return [...map.entries()].filter(([,v])=>v.length>=8).map(([key,v])=>({key,n:v.length,score:sigStats(v).meanHits10,rate2:sigStats(v).rate2})).sort((a,b)=>b.score-a.score).slice(0,k)
}
const out=['# SONAR — 1 → motivo → setting → performance','',`Dataset: ${N} draws; causal targets ${START}–${N-1}. Setting and hits use only history before target.`,'']
for(const k of [3,5,7]){
 const d=blocks[0].map(r=>({...r,m:r['m'+k]}))
 const cand=topComb(d,15)
 out.push(`## Discovery k=${k}`)
 for(const c of cand) out.push(`- ${c.key}: n=${c.n}, mean hits10=${c.score.toFixed(4)}, >=2=${(100*c.rate2).toFixed(2)}%`)
 out.push('')
 for(let bi=1;bi<3;bi++){
   const b=blocks[bi].map(r=>({...r,m:r['m'+k]}))
   out.push(`### Block ${bi+1}`)
   for(const c of cand){
     const v=b.filter(r=>r.m+'|'+r.s===c.key), rest=b.filter(r=>!(r.m+'|'+r.s===c.key))
     if(v.length>=3) out.push(`- ${c.key}: n=${v.length}, mean=${mean(v.map(x=>x.h)).toFixed(4)}, rest=${mean(rest.map(x=>x.h)).toFixed(4)}, delta=${(mean(v.map(x=>x.h))-mean(rest.map(x=>x.h))).toFixed(4)}`)
   }
 }
 out.push('')
}
out.push('## Unconditional block baselines')
blocks.forEach((b,i)=>out.push(`- B${i+1}: ${JSON.stringify(sigStats(b))}`))
out.push('', '## Null: temporal permutation of motif labels')
for(const k of [3,5,7]){
 const b=blocks[2].map(r=>({...r,m:r['m'+k]}))
 const d=blocks[0].map(r=>({...r,m:r['m'+k]}))
 const cand=topComb(d,5)
 for(const c of cand){
   const key=c.key, obs=b.filter(r=>r.m+'|'+r.s===key).map(x=>x.h)
   if(obs.length<3) continue
   let ge=0; const vals=b.map(x=>x.h), labels=b.map(x=>x.m)
   for(let z=0;z<500;z++){const shuffled=[...labels].sort(()=>Math.random()-.5);const v=[];for(let i=0;i<b.length;i++)if(shuffled[i]+'|'+b[i].s===key)v.push(vals[i]);if(v.length>=obs.length&&mean(v)>=mean(obs))ge++}
   out.push(`- k=${k} ${key}: blind n=${obs.length}, observed mean=${mean(obs).toFixed(4)}, permutation p~${((ge+1)/501).toFixed(4)}`)
 }
}
console.log(out.join('\n'))
