import draws from '../src/data/draws.js'
import { rankedCandidates } from '../src/engine/scoring.js'

const POOL=[21,35,41,40,35,19]
const CURVES=[
[.1414,.1294,.1264,.1017,.0984,.0939,.0718,.055,.0441,.0322,.0202,.018,.0097,.0097],
[.0722,.0789,.0767,.074,.0696,.0606,.0688,.061,.0561,.0572,.0531,.0415,.04,.0381],
[.0666,.0628,.0617,.0681,.0651,.0576,.0449,.0587,.0527,.052,.0438,.0475,.043,.0441],
[.0752,.0673,.0639,.0602,.0617,.0572,.0617,.061,.0531,.0535,.043,.0475,.0438,.0374],
[.0711,.0699,.0714,.0733,.077,.0662,.0636,.0662,.0539,.0535,.0583,.0456,.0419,.04],
[.1436,.1537,.1189,.1129,.1066,.0894,.0748,.0456,.0389,.0266,.0142,.0108,.015,.0116]
]
const MINAVG=12.67, MAXAVG=33.83

function dp(perPos){
  const d=[],b=[]
  for(let p=0;p<6;p++){
    const c=perPos[p], row=Array(c.length).fill(-1e99), br=Array(c.length).fill(-1)
    if(p===0)c.forEach((x,i)=>row[i]=x[1])
    else{
      const pc=perPos[p-1], pd=d[p-1], pref=[]; let bi=-1,bv=-1e99
      for(let i=0;i<pc.length;i++){if(pd[i]>bv){bv=pd[i];bi=i}pref[i]=bi}
      for(let i=0;i<c.length;i++){let lo=0,hi=pc.length-1,cut=-1;while(lo<=hi){const m=(lo+hi)>>1;if(pc[m][0]<c[i][0]){cut=m;lo=m+1}else hi=m-1}if(cut>=0){const k=pref[cut];if(k>=0){row[i]=c[i][1]+pd[k];br[i]=k}}}
    } d.push(row);b.push(br)
  }
  let k=d[5].indexOf(Math.max(...d[5])); if(k<0)return null
  const out=Array(6);for(let p=5;p>=0;p--){out[p]=perPos[p][k][0];k=b[p][k]}return out
}
function build(target){
  const pp=[]
  for(let p=0;p<6;p++){
    const full=rankedCandidates(draws.slice(0,target),p)
    const pool=full.slice(0,POOL[p]).map(([n])=>{const r=full.findIndex(x=>x[0]===n)+1;const w=CURVES[p][Math.floor((r-1)/3)]??.001;return [n,w]})
    pool.sort((a,b)=>a[0]-b[0]);pp.push(pool)
  }
  const nums=dp(pp); if(!nums)return null
  const ranks=nums.map((n,p)=>rankedCandidates(draws.slice(0,target),p).findIndex(x=>x[0]===n)+1)
  const avg=ranks.reduce((a,b)=>a+b,0)/6
  return {nums,ranks,avg}
}
const start=1600, end=draws.length-1
const hist=new Map(); let sum=0,n=0,filtered=0
for(let t=start;t<=end;t++){
  const c=build(t); if(!c)continue
  if(c.avg<MINAVG||c.avg>MAXAVG){filtered++;continue}
  const actual=new Set(draws[t][2]); const h=c.nums.filter(x=>actual.has(x)).length
  hist.set(h,(hist.get(h)||0)+1);sum+=h;n++
}
const parts=[0,1,2,3,4,5,6].map(k=>[k,hist.get(k)||0])
console.log(JSON.stringify({range:[start,end],targets:n,filtered,meanHits:sum/n,distribution:parts},null,2))
