const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0
const nums=()=>Array.from({length:90},(_,i)=>i+1)
const drawNums=d=>Array.isArray(d?.[2])?d[2].map(Number).filter(n=>Number.isInteger(n)&&n>=1&&n<=90):[]
const freqScore=(h,w)=>{const c=new Map(nums().map(n=>[n,0]));for(const d of h.slice(-w))for(const n of drawNums(d))c.set(n,c.get(n)+1);return c}
const gapData=h=>{const occ=new Map(nums().map(n=>[]));h.forEach((d,i)=>drawNums(d).forEach(n=>occ.get(n).push(i)));return occ}
const returnScore=h=>{const occ=gapData(h),out=new Map();for(const n of nums()){const a=occ.get(n),g=a.length?a.length===1?h.length-a[0]:h.length-1-a.at(-1):h.length,gaps=[];for(let i=1;i<a.length;i++)gaps.push(a[i]-a[i-1]);if(gaps.length<5){out.set(n,0);continue}const bw=Math.max(2,Math.round(Math.sqrt(mean(gaps)));let s=0,den=0;for(const x of gaps){const w=Math.exp(-((g-x)**2)/(2*bw*bw));s+=w;den+=w}out.set(n,den?s/den:0)}return out}
const trendScore=h=>{const f7=freqScore(h,7),f14=freqScore(h,14),f21=freqScore(h,21),out=new Map();for(const n of nums()){const r7=f7.get(n)/7,r14=f14.get(n)/14,r21=f21.get(n)/21,accel=r7-r21,recent=Math.max(0,Math.min(1,.5+accel*7.5)),level=Math.max(0,Math.min(1,r21/.12)),p=((r7>0?1:0)+(r14>0?1:0)+(r21>0?1:0))/3;out.set(n,.45*recent+.35*level+.2*p)}return out}
const positionScores=h=>{const out=Array.from({length:6},()=>new Map(nums().map(n=>[n,0])));for(const d of h)drawNums(d).forEach((n,p)=>out[p].set(n,out[p].get(n)+1));return out}
const orderNullScore=(p,n)=>{const k=p+1,lo=k,hi=90-(6-k);if(n<lo||n>hi)return 0;const c=(a,b)=>{if(b<0||b>a)return 0;let r=1;for(let i=1;i<=b;i++)r=r*(a-b+i)/i;return r};return c(n-1,p)*c(90-n,5-p)/c(90,6)}
const posAdjustedScore=h=>{const ps=positionScores(h),out=Array.from({length:6},()=>new Map());for(let p=0;p<6;p++)for(const n of nums()){const obs=ps[p].get(n),prior=orderNullScore(p,n);out[p].set(n,(obs+.5)/(h.length*prior+1))}return out}
const rankMap=m=>new Map([...m.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).map((x,i)=>[x[0],i+1]))
const ticketGlobal=m=>[...m.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,6).map(x=>x[0]).sort((a,b)=>a-b)
const ticketPositions=scores=>{const out=[],r=scores.map(rankMap);let prev=0;for(let p=0;p<6;p++){const remain=5-p,c=[...r[p].entries()].filter(([n])=>n>prev&&n<=90-remain);if(!c.length)return null;c.sort((a,b)=>a[1]-b[1]||a[0]-b[0]);out.push(c[0][0]);prev=c[0][0]}return out}
const normalize=m=>{const a=[...m.values()],lo=Math.min(...a),hi=Math.max(...a),o=new Map();for(const n of nums())o.set(n,hi===lo?0:(m.get(n)-lo)/(hi-lo));return o}
const combine=(ms,ws)=>{const ns=ms.map(normalize),o=new Map();for(const n of nums())o.set(n,ns.reduce((s,m,i)=>s+m.get(n)*ws[i],0));return o}
export function strategy(h,name){const freq=normalize(freqScore(h,10)),ret=normalize(returnScore(h)),trend=normalize(trendScore(h)),pos=posAdjustedScore(h);if(name==='FREQUENCY')return ticketGlobal(freq);if(name==='RETURN')return ticketGlobal(ret);if(name==='TREND')return ticketGlobal(trend);if(name==='POSITION')return ticketPositions(pos);if(name==='TREND+FREQ')return ticketGlobal(combine([trend,freq],[.5,.5]));if(name==='FREQ+RETURN')return ticketGlobal(combine([freq,ret],[.5,.5]));return null}
export const STRATEGIES=['FREQUENCY','RETURN','TREND','POSITION','TREND+FREQ','FREQ+RETURN']
