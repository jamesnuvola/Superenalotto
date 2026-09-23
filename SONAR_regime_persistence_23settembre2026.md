# SONAR — Test persistenza dei successi / regime transition
## 23/09/2026

### Obiettivo
Verificare l'ipotesi operativa: un metodo può funzionare bene in alcune fasi e male in altre; prima di cercare un detector di regime, misurare se un "successo" pregresso tende a essere seguito da un altro successo.

### Dataset e causalità
- Repository: jamesnuvola/Superenalotto
- 2.923 estrazioni disponibili, fino al 22/09/2026.
- Finestra di test: target 601–2923 (2.323 target).
- CORE: motore di ranking esatto ricostruito da src/engine/scoring.js; per ogni posizione il successo è la presenza del numero reale nei primi 10 candidati.
- PRIOR: vettore fisso [13,26,39,52,65,78].
- SHAPE-50/100/200: analogo storico causale costruito usando esclusivamente il vettore dei gap dell'ultima estrazione già osservata; l'analogo è cercato nella finestra storica indicata, escludendo l'ultima estrazione. Non viene usato il target futuro.
- Successo di estrazione = almeno k posizioni riuscite, con k=1,2,3,4.
- La persistenza è confrontata tra P(successo al target t+1 | successo al target t) e P(successo al target t+1 | fallimento al target t).

### Risultati complessivi
| Metodo | Media hit/6 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | >=2 | >=3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| CORE | 1.816 | 266 | 696 | 767 | 425 | 133 | 35 | 1 | 58.59% | 25.57% |
| PRIOR | 0.165 | 1972 | 321 | 28 | 2 | 0 | 0 | 0 | 1.29% | 0.086% |
| SHAPE-50 | 0.159 | 1973 | 331 | 19 | 0 | 0 | 0 | 0 | 0.82% | 0% |
| SHAPE-100 | 0.167 | 1961 | 336 | 25 | 1 | 0 | 0 | 0 | 1.12% | 0.043% |
| SHAPE-200 | 0.166 | 1962 | 337 | 23 | 1 | 0 | 0 | 0 | 1.03% | 0.043% |

### Persistenza del successo

#### CORE
| Soglia | Frequenza successo | Dopo successo | Dopo fallimento | Delta |
|---|---:|---:|---:|---:|
| >=1 | 88.55% | 88.76% | 86.84% | +1.92 pp |
| >=2 | 58.59% | 57.43% | 60.19% | -2.76 pp |
| >=3 | 25.57% | 26.64% | 25.22% | +1.43 pp |
| >=4 | 7.28% | 5.92% | 7.39% | -1.47 pp |

Il segnale non mostra una persistenza monotona: a soglia >=2, che è quella più interessante per una sestina, il successo è leggermente MENO probabile dopo un successo precedente.

#### PRIOR
- >=1: 15.11%; dopo successo 15.67%, dopo fallimento 15.02%, delta +0.65 pp.
- >=2: 1.29%; dopo successo 0%, dopo fallimento 1.31%.
- >=3: 0.086%; dopo successo 0%, dopo fallimento 0.086%.
Campione troppo raro per sostenere un regime persistente.

#### SHAPE
- SHAPE-50 >=1: 15.07%; dopo successo 12.00%, dopo fallimento 15.62%.
- SHAPE-100 >=1: 15.58%; dopo successo 14.64%, dopo fallimento 15.77%.
- SHAPE-200 >=1: 15.54%; dopo successo 13.57%, dopo fallimento 15.91%.
Per >=2 i casi sono troppo pochi e nessuna persistenza positiva emerge.

### Conclusione
1. L'ipotesi "quando un metodo funziona, tende a continuare a funzionare" NON trova supporto nel test causale eseguito.
2. Il CORE mostra una copertura forte rispetto agli altri candidati, ma il successo non si auto-propaga in modo utile.
3. PRIOR e SHAPE producono successi troppo rari per essere trattati come stati persistenti.
4. Questo NON dimostra che le fasi non esistano. Dimostra una cosa più precisa: il semplice stato "il metodo ha funzionato nell'estrazione precedente" non è un detector affidabile della fase successiva.
5. La strada successiva, se mantenuta, deve cercare un indicatore di regime indipendente dal risultato appena osservato oppure una struttura pre-draw più ricca; non conviene costruire un Markov detector basato sul semplice successo/fallimento.
6. Produzione: invariata. Nessuna promozione.

### Nota metodologica
Questo test misura persistenza di copertura per posizione, non la qualità di una sestina generata dal multigen. È quindi un test diagnostico di regime, non un backtest completo del generatore.

