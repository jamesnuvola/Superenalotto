import fs from 'node:fs';
import path from 'node:path';

const input = process.argv[2] ?? 'data/player-behavior/snapshots.js';
const output = process.argv[3] ?? 'data/player-behavior/results.json';
const mod = await import(path.resolve(input));
const snapshots = mod.default ?? mod.SNAPSHOTS ?? [];

function C(n,k){ if(k<0||k>n)return 0; let r=1; for(let i=1;i<=k;i++) r*= (n-i+1)/i; return r; }
function hg(k,h){ return C(k,h)*C(90-k,6-h)/C(90,6); }
function expected(k){ return 6*k/90; }
function variance(k){ return 6*(k/90)*(1-k/90)*(84/89); }
function cdf(k,h){ let p=0; for(let x=0;x<=h;x++) p+=hg(k,x); return p; }
function nums(a=[]){ return [...new Set(a.map(Number))].sort((a,b)=>a-b); }
function validate(s){
  const n=nums(s.numbers);
  if(!n.length || n.some(x=>x<1||x>90)) throw new Error('Invalid number universe in system '+s.id);
  return {...s,numbers:n};
}
function analyze(snap){
  const systems=(snap.systems??[]).map(validate);
  const draw=snap.draw==null?null:nums(snap.draw);
  if(draw && draw.length!==6) throw new Error('Contest '+snap.contest+': draw must contain 6 numbers');
  const rows=systems.map(s=>{
    const k=s.numbers.length;
    if(!draw) return {id:s.id,name:s.name??null,type:s.type??null,k,numbers:s.numbers};
    const hits=s.numbers.filter(n=>draw.includes(n)).length;
    const sd=Math.sqrt(variance(k));
    return {id:s.id,name:s.name??null,type:s.type??null,k,hits,expectedHit:expected(k),excess:hits-expected(k),z:sd?(hits-expected(k))/sd:0,hitCdf:cdf(k,hits),numbers:s.numbers};
  });
  const coverage=Array.from({length:90},(_,i)=>{
    const n=i+1, count=systems.filter(s=>s.numbers.includes(n)).length;
    return {number:n,systems:count,share:systems.length?count/systems.length:0,drawHit:draw?draw.includes(n):false};
  });
  const ranked=[...coverage].sort((a,b)=>b.systems-a.systems||a.number-b.number);
  const actual=draw?coverage.filter(x=>x.drawHit).map(x=>({number:x.number,systems:x.systems,share:x.share,rank:ranked.findIndex(r=>r.number===x.number)+1})):[];
  const meanHits=draw&&rows.length?rows.reduce((a,r)=>a+r.hits,0)/rows.length:null;
  return {contest:snap.contest,date:snap.date,capturedAt:snap.capturedAt,source:snap.source??null,nSystems:systems.length,meanHits,maxHits:draw&&rows.length?Math.max(...rows.map(r=>r.hits)):null,systems:rows.sort((a,b)=>(b.z??-Infinity)-(a.z??-Infinity)),numberCoverage:coverage,actualNumberCoverage:actual};
}
const results=snapshots.map(analyze);
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({generatedAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify(results.map(r=>({contest:r.contest,date:r.date,nSystems:r.nSystems,meanHits:r.meanHits,maxHits:r.maxHits,actual:r.actualNumberCoverage,top:r.systems.filter(x=>x.hits!=null).slice(0,5).map(x=>({id:x.id,k:x.k,hits:x.hits,z:x.z}))})),null,2));
