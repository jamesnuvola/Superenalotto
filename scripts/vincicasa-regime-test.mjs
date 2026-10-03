import draws from '../src/data/draws.js'
import { writeFileSync } from 'node:fs'

const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const pct=(a,k)=>a.length?a.filter(x=>x>=k).length/a.length*100:0
const hit=(ticket,real)=>ticket.filter(n=>real.includes(n)).length
const nums=()=>Array.from({length:90},(_,i)=>i+1)
const baseline={mean:0.4,ge1:34.7138,ge2:4.9631,ge3:0.3642}

function freqScore(h,w){const c=new Map(nums().map(n=>[n,0]));for(const d of h.slice(-w))for(const n of d[2])c.set(n,c.get(n)+1);return c}
function gapData(h){const occ=new Map(nums().map(n=>[]));h.forEach((d,i)=>d[2].forEach(n=>(occ.get(n)||[]).push(i)));return occ}
function returnScore(h){const occ=gapData(h),out=new Map();for(const n of nums()){const a=occ.get(n)||[],g=a.length?a.length===1?h.length-a[0]:h.length-1-a[a.length-1]:h.length;const gaps=[];for(let i=1;i<a.length;i++)gaps.push(a[i]-a[i-1]);if(gaps.length<5){out.set(n,0);continue}const bw=Math.max(2,Math.round(Math.sqrt(mean(gaps))));let s=0,den=0;for(const x of gaps){const w=Math.exp(-((g-x)**2)/(2*bw*bw));s+=w;den+=w}out.set(n,den?s/den:0)}return out}
function trendScore(h){const f7=freqScore(h,7),f14=freqScore(h,14),f21=freqScore(h,21),out=new Map();for(const n of nums()){const r7=f7.get(n)/7,r14=f14.get(n)/14,r21=f21.get(n)/21,accel=r7-r21,recent=Math.max(0,Math.min(1,.5+accel*7.5)),level=Math.max(0,Math.min(1,r21/.12)),persistence=((r7>0?1:0)+(r14>0?1:0)+(r21>0?1:0))/3;out.set(n,.45*recent+.35*level+.20*persistence)}return out}
function lifecycleScore(h){const t=trendScore(h),out=new Map();for(const n of nums()){const vals=[7,14,21,30].map(w=>freqScore(h,w).get(n)/w),accel=vals[0]-vals[2],persist=(vals[0]>0?1:0)+(vals[1]>0?1:0)+(vals[2]>0?1:0);out.set(n,t.get(n)+.12*Math.max(-1,Math.min(1,accel*8))+.05*(persist/3))}return out}
function positionScores(h){const out=Array.from({length:6},()=>new Map(nums().map(n=>[n,0])));for(const d of h)d[2].forEach((n,p)=>out[p].set(n,out[p].get(n)+1));return out}
function orderNullScore(p,n){const k=p+1,lo=k,hi=90-(6-k);if(n<lo||n>hi)return 0;const c=(a,b)=>{if(b<0||b>a)return 0;let r=1;for(let i=1;i<=b;i++)r=r*(a-b+i)/i;return r};return c(n-1,p)*c(90-n,5-p)/c(90,6)}
function posAdjustedScore(h){const ps=positionScores(h),out=Array.from({length:6},()=>new Map());for(let p=0;p<6;p++)for(const n of nums()){const obs=ps[p].get(n),prior=orderNullScore(p,n);out[p].set(n,(obs+.5)/(h.length*prior+1))}return out}
function month(d){return d[0].slice(3).split('/').reverse().join('-')}
function nucleusScores(h,i){h=h.slice(-120);const targetMonth=month(h[i]||h.at(-1)),out=Array.from({length:6},()=>new Map(nums().map(n=>[n,0]))),months=[...new Set(h.map(month))].sort(),idx=months.indexOf(targetMonth);if(idx<3)return out;const prev=months.slice(idx-3,idx);for(let p=0;p<6;p++)for(const n of nums()){const ok=prev.every(m=>h.some(d=>month(d)===m&&d[2][p]===n)),current=h.slice(0,i).some(d=>month(d)===targetMonth&&d[2][p]===n);if(ok&&!current)out[p].set(n,1)}return out}
function relationScores(h){h=h.slice(-200);const pairs=new Map(),triples=new Map(),pos=Array.from({length:6},()=>new Map());for(let i=0;i<h.length-1;i++){const a=h[i][2],b=h[i+1][2];for(let x=0;x<6;x++)for(let y=x+1;y<6;y++){const k=a[x]+','+a[y];if(!pairs.has(k))pairs.set(k,new Map());for(const n of b)pairs.get(k).set(n,(pairs.get(k).get(n)||0)+1)}for(let x=0;x<6;x++)for(let y=x+1;y<6;y++)for(let z=y+1;z<6;z++){const k=a[x]+','+a[y]+','+a[z];if(!triples.has(k))triples.set(k,new Map());for(const n of b)triples.get(k).set(n,(triples.get(k).get(n)||0)+1)}for(let p=0;p<6;p++){const x=a[p],y=b[p];if(!pos[p].has(x))pos[p].set(x,new Map());const m=pos[p].get(x);m.set(y,(m.get(y)||0)+1)}}const last=h.at(-1)[2],ps=new Map(),ts=new Map(),xs=Array.from({length:6},()=>new Map());for(let x=0;x<6;x++)for(let y=x+1;y<6;y++){const m=pairs.get(last[x]+','+last[y]);if(!m)continue;const tot=[...m.values()].reduce((a,b)=>a+b,0);for(const [n,c] of m)ps.set(n,(ps.get(n)||0)+c/tot*Math.sqrt(tot))}for(let x=0;x<6;x++)for(let y=x+1;y<6;y++)for(let z=y+1;z<6;z++){const m=triples.get(last[x]+','+last[y]+','+last[z]);if(!m)continue;const tot=[...m.values()].reduce((a,b)=>a+b,0);for(const [n,c] of m)ts.set(n,(ts.get(n)||0)+c/tot*Math.sqrt(tot))}for(let p=0;p<6;p++){const m=pos[p].get(last[p]);if(!m)continue;const tot=[...m.values()].reduce((a,b)=>a+b,0);for(const [n,c] of m)xs[p].set(n,c/tot)}return {pairs:ps,triples:ts,pos:xs}}
function rankMap(m){return new Map([...m.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map((x,i)=>[x[0],i+1]))}
function ticketGlobal(score){return [...score.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,6).map(x=>x[0]).sort((a,b)=>a-b)}
function ticketPositions(scores){const out=[],ranks=scores.map(rankMap);let prev=0;for(let p=0;p<6;p++){const remain=5-p,cand=[...ranks[p].entries()].filter(([n])=>n>prev&&n<=90-remain);if(!cand.length)return null;cand.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);const n=cand[0][0];out.push(n);prev=n}return out}
function normalize(m){const a=[...m.values()],lo=Math.min(...a),hi=Math.max(...a),out=new Map();for(const n of nums())out.set(n,hi===lo?0:(m.get(n)-lo)/(hi-lo));return out}
function combine(ms,ws){const ns=ms.map(normalize),out=new Map();for(const n of nums())out.set(n,ns.reduce((s,m,i)=>s+m.get(n)*ws[i],0));return out}
function strategy(h,i,name){const freq=normalize(freqScore(h,10)),ret=normalize(returnScore(h)),trend=normalize(trendScore(h)),life=normalize(lifecycleScore(h)),rel=relationScores(h),pos=posAdjustedScore(h),nuc=nucleusScores(h,i);if(name==='FREQUENCY')return ticketGlobal(freq);if(name==='RETURN')return ticketGlobal(ret);if(name==='TREND')return ticketGlobal(trend);if(name==='LIFECYCLE')return ticketGlobal(life);if(name==='NUCLEUS')return ticketPositions(nuc);if(name==='RELATION'){const s=Array.from({length:6},(_,p)=>new Map(nums().map(n=>[n,(rel.pairs.get(n)||0)*.65+(rel.triples.get(n)||0)*.2+(rel.pos[p].get(n)||0)*.15])));return ticketPositions(s)}if(name==='POSITION')return ticketPositions(pos);if(name==='BALANCED'){const s=Array.from({length:6},(_,p)=>new Map(nums().map(n=>[n,.35*(nuc[p].get(n)||0)+.30*(rel.pairs.get(n)||0)+.10*(rel.triples.get(n)||0)+.15*(rel.pos[p].get(n)||0)+.10*freq.get(n)]));return ticketPositions(s)}if(name==='TREND+RELATION')return ticketGlobal(combine([trend,normalize(rel.pairs)],[.5,.5]));if(name==='TREND+LIFE')return ticketGlobal(combine([trend,life],[.7,.3]));if(name==='FREQ+RETURN')return ticketGlobal(combine([freq,ret],[.5,.5]));if(name==='REGIME_TREND'){const recent=h.slice(-21),sum=mean(recent.map(d=>d[2].reduce((a,b)=>a+b,0))),high=mean(recent.map(d=>d[2].filter(n=>n>=46).length));return ticketGlobal(high>=3||sum>=285?trend:life)}return null}

const STRATS=['FREQUENCY','RETURN','TREND','LIFECYCLE','NUCLEUS','RELATION','POSITION','BALANCED','TREND+RELATION','TREND+LIFE','FREQ+RETURN','REGIME_TREND']
const REGIMES=['SUM_HIGH','SUM_LOW','HIGHNUM_HIGH','HIGHNUM_LOW','REPEAT_HIGH','REPEAT_LOW','ODD_HIGH','ODD_LOW']
const START=Math.max(300,Number(process.env.START||2700)),END=Math.min(Number(process.env.END||draws.length-1),draws.length-1)
const rows=Object.fromEntries(STRATS.map(s=>[s,Object.fromEntries(REGIMES.map(r=>[r,[]]))]))
function median(a){const x=[...a].sort((a,b)=>a-b);return x.length%2?x[(x.length-1)/2]:(x[x.length/2-1]+x[x.length/2])/2}
function regimeFlags(h){
  const w=h.slice(-21), sums=w.map(d=>d[2].reduce((a,b)=>a+b,0)), highs=w.map(d=>d[2].filter(n=>n>=46).length), odds=w.map(d=>d[2].filter(n=>n%2).length)
  const hist=[];for(let j=21;j<h.length;j++)hist.push(h.slice(j-21,j).reduce((s,d)=>s+d[2].reduce((a,b)=>a+b,0),0))
  const sumRef=hist.length?median(hist):mean(sums)
  const sum=mean(sums), high=mean(highs), odd=mean(odds)
  const repeat=w.length>1?w.slice(1).reduce((s,d,j)=>s+d[2].filter(n=>w[j][2].includes(n)).length,0)/(w.length-1):0
  return {SUM_HIGH:sum>=sumRef,SUM_LOW:sum<sumRef,HIGHNUM_HIGH:high>=3,HIGHNUM_LOW:high<3,REPEAT_HIGH:repeat>=.5,REPEAT_LOW:repeat<.5,ODD_HIGH:odd>=3,ODD_LOW:odd<3}
}
for(let i=START;i<=END;i++){
  const h=draws.slice(0,i),flags=regimeFlags(h),real=draws[i][2]
  for(const s of STRATS){const k=hit(strategy(h,i,s),real);for(const r of REGIMES)if(flags[r])rows[s][r].push(k)}
}
let out='# SONAR — VinciCasa → SuperEnalotto: regime-conditioned test\n\n'
out+=`Dataset: ${draws.length} estrazioni, target ${draws[START][0]} → ${draws[END][0]} (${END-START+1} target). I regimi sono calcolati esclusivamente dal prefisso precedente a ogni target.\n\n`
out+='## Baseline casuale 6/90\n\n- hit medi: 0.400\n- P(≥1): 34.714%\n- P(≥2): 4.963%\n- P(≥3): 0.364%\n\n'
out+='## Regimi\n\n- SUM_HIGH/LOW: somma media ultime 21 estrazioni sopra/sotto la mediana delle somme storiche delle finestre precedenti.\n- HIGHNUM_HIGH/LOW: media dei numeri ≥46 nelle ultime 21 estrazioni >=3 / <3.\n- REPEAT_HIGH/LOW: sovrapposizione media tra estrazioni consecutive nelle ultime 21 >=0.5 / <0.5 numeri.\n- ODD_HIGH/LOW: media dei dispari nelle ultime 21 >=3 / <3.\n\n'
out+='## Risultati per regime\n\n| Strategia | Regime | N | Hit medi | Δ vs 0.400 | ≥1 | ≥2 | ≥3 |\n|---|---|---:|---:|---:|---:|---:|---:|\n'
for(const s of STRATS)for(const r of REGIMES){const a=rows[s][r];if(!a.length)continue;const m=mean(a);out+=`| ${s} | ${r} | ${a.length} | ${m.toFixed(3)} | ${(m-.4).toFixed(3)} | ${pct(a,1).toFixed(1)}% | ${pct(a,2).toFixed(1)}% | ${pct(a,3).toFixed(1)}% |\n`}
out+='\n## Regola di lettura\n\nQuesto è uno screening di contesto, non una selezione della strategia migliore. Un eventuale vantaggio in un regime va considerato solo come candidato: il passo successivo è congelare le definizioni dei regimi, verificare su un periodo OOS successivo e confrontare anche la distribuzione rispetto a ticket casuali nello stesso regime. L obiettivo è costruire una mappa "regime → strategia utile" e, dove una strategia fallisce, cercare una strategia complementare invece di forzarla.\n'
writeFileSync('SONAR_vincicasa_regime_superenalotto_2026-10-02.md',out)
console.log(out)