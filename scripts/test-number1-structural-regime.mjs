import draws from '../src/data/draws.js'
import { actualRank } from '../src/engine/scoring.js'
const DS=draws.map(d=>({date:d[0],numbers:[...d[2]],raw:d})),N=DS.length,START=800
const one=t=>DS[t].numbers[0]===1, mean=a=>a.length? a.reduce((s,x)=>s+x,0)/a.length:0
const ranks=t=>DS[t].numbers.map((n,p)=>actualRank(DS.slice(0,t).map(x=>x.raw),p,n).rank)
const feat=t=>{const r=ranks(t),a=DS[t].numbers,g=a.slice(1).map((x,i)=>x-a[i]);return {r,rm:mean(r),k2:r.filter(x=>x<=2).length,k5:r.filter(x=>x<=5).length,spread:a[5]-a[0],sum:a.reduce((s,x)=>s+x,0),low:a.filter(x=>x<=30).length,mid:a.filter(x=>x>30&&x<=60).length,high:a.filter(x=>x>60).length,odd:a.filter(x=>x%2).length,g1:g.filter(x=>x===1).length,top3:r.filter(x=>x<=3).length,top10:r.filter(x=>x<=10).length}}
const R=[];for(let t=START;t<N;t++){const f=feat(t),prev=feat(t-1),prev2=feat(t-2);R.push({t,one:one(t),prev1:one(t-1),prev3:[t-3,t-2,t-1].map(one).join(''),...f,drm:f.rm-prev.rm,dk2:f.k2-prev.k2,dt10:f.top10-prev.top10,dspread:f.spread-prev.spread,dsum:f.sum-prev.sum,dhigh:f.high-prev.high,dlow:f.low-prev.low,prev_rm:prev.rm,prev_k2:prev.k2,prev_spread:prev.spread,prev_high:prev.high,prev_low:prev.low,prev_top10:prev.top10,prev_top3:prev.top3}})}
const blocks=[R.slice(0,Math.floor(R.length*.4)),R.slice(Math.floor(R.length*.4),Math.floor(R.length*.7)),R.slice(Math.floor(R.length*.7))]
const metricNames=['rm','k2','k5','spread','sum','low','mid','high','odd','g1','top3','top10','drm','dk2','dt10','dspread','dsum','dhigh','dlow','prev_rm','prev_k2','prev_spread','prev_high','prev_low','prev_top10','prev_top3']
const med=a=>{const s=[...a].sort((x,y)=>x-y);return s[Math.floor((s.length-1)/2)]}
const stat=(a,m)=>{const x=a.map(r=>r[m]).filter(Number.isFinite);return {n:x.length,mean:mean(x),med:med(x),sd:Math.sqrt(mean(x.map(v=>(v-mean(x))**2)))}} 
const corr=(a,m,y)=>{const x=a.map(r=>r[m]),z=a.map(r=>r[y]),mx=mean(x),mz=mean(z);let q=0,xx=0,zz=0;for(let i=0;i<x.length;i++){q+=(x[i]-mx)*(z[i]-mz);xx+=(x[i]-mx)**2;zz+=(z[i]-mz)**2}return q/Math.sqrt(xx*zz)}
const out=['# SONAR — 1 → struttura → cambio regime','',`Dataset ${N}; target causali ${START}–${N-1}. Tutte le feature del target sono calcolate con storia precedente.`,'']
for(const condName of ['prev1','prev3']){
 out.push(`## Condizione ${condName}`)
 for(const b of blocks){const c=b.filter(r=>condName==='prev1'?r.prev1:r.prev3.includes('1')),q=b.filter(r=>condName==='prev1'?!r.prev1:!r.prev3.includes('1'));out.push(`N=${c.length} vs rest=${q.length}; rm ${stat(c,'rm').mean.toFixed(3)} vs ${stat(q,'rm').mean.toFixed(3)}; k2 ${stat(c,'k2').mean.toFixed(3)} vs ${stat(q,'k2').mean.toFixed(3)}; top10 ${stat(c,'top10').mean.toFixed(3)} vs ${stat(q,'top10').mean.toFixed(3)}`)}
}
out.push('', '## Differenze strutturali: condizione precedente vs resto')
for(const m of metricNames){const vals=[];for(const b of blocks){const c=b.filter(r=>r.prev1),q=b.filter(r=>!r.prev1);vals.push(stat(c,m).mean-stat(q,m).mean)};out.push(`- ${m}: B1 ${vals[0].toFixed(4)}, B2 ${vals[1].toFixed(4)}, B3 blind ${vals[2].toFixed(4)}`)}
out.push('', '## Cambio di regime: correlazioni feature t-1 → variazione t')
for(const m of ['rm','k2','spread','sum','high','low','top10']){for(const y of ['drm','dk2','dspread','dsum','dhigh','dlow','dt10']){const v=blocks.map(b=>corr(b,m,y));if(v.some(x=>Math.abs(x)>=.08))out.push(`- ${m}→${y}: ${v.map(x=>x.toFixed(3)).join(' / ')}`)}} 
out.push('', '## Regime transitions conditioned on previous 1')
for(const b of blocks){for(const threshold of [0,1,2,3,5,10]){const c=b.filter(r=>r.prev1&&r.k2>=threshold),q=b.filter(r=>!r.prev1&&r.k2>=threshold);if(c.length>=3)out.push(`K2>=${threshold}: prev1 n=${c.length} rate=${(c.length?c.length/b.length:0).toFixed(3)}; rest n=${q.length}`)}} 
console.log(out.join('\n'))
