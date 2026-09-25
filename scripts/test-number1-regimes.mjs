import draws from '../src/data/draws.js'
import { actualRank, rankedCandidates } from '../src/engine/scoring.js'

const DS = draws.map(d=>({date:d[0],numbers:[...d[2]]}))
const N=DS.length
const has1=d=>d.numbers[0]===1
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0
const q=(a,p)=>{const s=[...a].sort((x,y)=>x-y);if(!s.length)return 0;const z=(s.length-1)*p,i=Math.floor(z),f=z-i;return s[i]+(s[i+1]-s[i])*f}
const band=r=>r<=5?'A1-5':r<=10?'B6-10':r<=20?'C11-20':'D21+'
const sig=r=>r.map(band).join('|')
const ranksAt=t=>DS[t].numbers.map((n,p)=>actualRank(DS.slice(0,t).map(x=>x.raw),p,n).rank)
const preSetting=t=>sig(ranksAt(t))
const features=t=>{const a=DS[t].numbers,g=a.slice(1).map((x,i)=>x-a[i]);return {sum:mean(a)*6,spread:a[5]-a[0],low:a.filter(x<=30).length,mid:a.filter(x>30&&x<=60).length,high:a.filter(x>60).length,odd:a.filter(x=>x%2).length,g1:g.filter(x=>x===1).length,k2:ranksAt(t).filter(r=>r<=2).length,rm:mean(ranksAt(t))}}
const condRows=c=>{const r=[];for(let t=600;t<N;t++)if(c(t)){const rr=ranksAt(t),f=features(t);r.push({t,rr,s:sig(rr),...f})}return r}
const prev1=condRows(t=>has1(DS[t-1])), prev0=condRows(t=>!has1(DS[t-1]))
const top=(rows,k=10)=>{const m=new Map();for(const r of rows)m.set(r.s,(m.get(r.s)||0)+1);return [...m.entries()].sort((a,b)=>b[1]-a[1]).slice(0,k)}
const sm=rows=>({n:rows.length,rm:mean(rows.map(r=>r.rm)),k2:mean(rows.map(r=>r.k2)),sum:mean(rows.map(r=>r.sum)),spread:mean(rows.map(r=>r.spread)),low:mean(rows.map(r=>r.low)),mid:mean(rows.map(r=>r.mid)),high:mean(rows.map(r=>r.high)),odd:mean(rows.map(r=>r.odd)),g1:mean(rows.map(r=>r.g1))})
const pct=x=>(100*x).toFixed(2)+'%'

function rolling(w){
  const z=[];for(let t=w;t<N;t++){let c=0;for(let j=t-w;j<t;j++)c+=has1(DS[j])?1:0;z.push({t,rate:c/w})}return z
}
function runs(){
  const out=[];let st=0,state=has1(DS[0]);for(let i=1;i<=N;i++){const ns=i<N?has1(DS[i]):!state;if(ns!==state){out.push({state,len:i-st,start:DS[st].date,end:DS[i-1].date});st=i;state=ns}}return out
}
function motifs(k){
  const m=new Map();for(let t=Math.max(600,k);t<N;t++){const x=DS.slice(t-k,t).map(d=>has1(d)?'1':'0').join('');const s=preSetting(t);if(!m.has(x))m.set(x,[]);m.get(x).push(s)}
  return [...m.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,20).map(([m,a])=>{const c=new Map();for(const s of a)c.set(s,(c.get(s)||0)+1);return [m,a.length,[...c.entries()].sort((x,y)=>y[1]-x[1]).slice(0,3)]})
}
function regime(w){
  const rr=rolling(w),v=rr.map(x=>x.rate),lo=q(v,.25),hi=q(v,.75),out={high:[],low:[]}
  for(const x of rr){if(x.t>=N)continue;const r={s:preSetting(x.t),...features(x.t)};if(x.rate>=hi)out.high.push(r);if(x.rate<=lo)out.low.push(r)}
  return {lo,hi,...out}
}

let md='# SONAR — numero 1 in P1: regimi e setting ricorrenti — 25/09/2026\n\n'
md+=`Dataset: **${N}** estrazioni, fino al 24/09/2026. P1 è il primo numero della sestina ordinata nel nostro modello. I test sul draw successivo usano solo dati precedenti al target.\n\n`
const A=sm(prev1),B=sm(prev0)
md+='## 1. Draw successivo dopo presenza/assenza di 1\n\n'
md+='| misura | dopo 1 | dopo assenza |\n|---|---:|---:|\n'
for(const [n,k] of [['N','n'],['Mean rank','rm'],['K2 medio','k2'],['Somma','sum'],['Spread','spread'],['1-30','low'],['31-60','mid'],['61-90','high'],['Dispari','odd'],['Gap=1','g1']])md+=`|${n}|${A[k].toFixed(3)}|${B[k].toFixed(3)}|\n`
md+='\n### Setting SONAR più frequenti dopo 1\n\n'
for(const [s,n] of top(prev1))md+=`- \`${s}\`: ${n}\n`
md+='\n### Setting SONAR più frequenti dopo assenza di 1\n\n'
for(const [s,n] of top(prev0))md+=`- \`${s}\`: ${n}\n`

const rs=runs(),one=rs.filter(x=>x.state),zero=rs.filter(x=>!x.state)
md+='\n## 2. Regimi della presenza di 1\n\n'
md+=`Run presenza: n=${one.length}, media ${mean(one.map(x=>x.len)).toFixed(2)}, max ${Math.max(...one.map(x=>x.len))}. Run assenza: n=${zero.length}, media ${mean(zero.map(x=>x.len)).toFixed(2)}, max ${Math.max(...zero.map(x=>x.len))}.\n\n`
for(const w of [20,50,100,200]){const v=rolling(w).map(x=>x.rate);md+=`- W${w}: Q25 ${pct(q(v,.25))}, mediana ${pct(q(v,.5))}, Q75 ${pct(q(v,.75))}, min ${pct(Math.min(...v))}, max ${pct(Math.max(...v))}.\n`}
md+='\nUltimi 15 run di presenza:\n\n'+one.slice(-15).map(x=>`- ${x.start} → ${x.end}: ${x.len} draw`).join('\n')+'\n'

for(const w of [50,100]){
 const R=regime(w),H=sm(R.high),L=sm(R.low)
 md+=`\n## 3. Regime di frequenza W${w}\n\n`
 md+=`High (>=Q75): n=${R.high.length}, mean rank=${H.rm.toFixed(3)}, K2=${H.k2.toFixed(3)}; Low (<=Q25): n=${R.low.length}, mean rank=${L.rm.toFixed(3)}, K2=${L.k2.toFixed(3)}.\n\n`
 md+='Top setting HIGH:\n'+top(R.high).map(x=>`- \`${x[0]}\`: ${x[1]}`).join('\n')+'\n\nTop setting LOW:\n'+top(R.low).map(x=>`- \`${x[0]}\`: ${x[1]}`).join('\n')+'\n'
}
for(const k of [3,5,7,10]){
 md+=`\n## 4. Motivi ultimi ${k} draw e setting successivo\n\n`
 for(const [m,n,ss] of motifs(k))md+=`- \`${m}\` (n=${n}): ${ss.map(x=>x[0]+' × '+x[1]).join(', ')}\n`
}
md+='\n## 5. Interpretazione\n\nLa presenza di 1 viene trattata come possibile **indicatore di regime**, non come causa. Una firma è interessante solo se ricorre in più blocchi cronologici e mantiene differenze rispetto a un null temporale; nessuna regola viene promossa da questo test diagnostico da sola.\n'
console.log(md)
