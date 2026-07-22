import { loadDraws } from './engine.mjs'; // adattare al caricamento storico WLF
import { actualRank } from './scoring.wlf.js';

const draws = loadDraws('../winforlife_draws.json'); // fornisci il tuo file storico in JSON
const MIN_HISTORY = 200;

let sumRanks = Array(10).fill(0);
let count = 0;

for (let t = MIN_HISTORY; t < draws.length; t++) {
  const history = draws.slice(0, t);
  const current = draws[t];
  for (let p = 0; p < 10; p++) {
    const { rank } = actualRank(history, p, current.numbers[p]);
    sumRanks[p] += rank;
  }
  count++;
}

console.log('Rank medi per posizione (walk‑forward):');
for (let p = 0; p < 10; p++) {
  console.log(`P${p+1}: ${(sumRanks[p] / count).toFixed(2)}`);
}
