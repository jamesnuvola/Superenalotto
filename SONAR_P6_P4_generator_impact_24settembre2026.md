# SONAR — Test P6 persistence e P4 inverse sul generatore
## 24 settembre 2026

### Obiettivo
Verificare se i due segnali individuati nel test pre-draw del 24/09 possono produrre un effetto sul generatore, senza riottimizzare le soglie:

- P6: precedente rank CORE P6 <= 1 -> test di restrizione del pool P6 dai 19 candidati standard ai primi 10.
- P4: precedente rank CORE P4 <= 2 -> test esplorativo di restrizione del pool P4 dai 40 candidati standard ai primi 10.

Holdout cronologico: target 2149–2923 (775 estrazioni), completamente successivo ai due blocchi usati per individuare i segnali. Il ranking CORE e la generazione sono ricostruiti dalla logica corrente del repository; il test non modifica la produzione.

### P6 — risultato
Condizione precedente P6 rank <=1 verificata in 39 delle 775 estrazioni.

Sulle 39 estrazioni condizionate, confrontando 10 sestine generate dal generatore standard con 10 sestine generate restringendo P6 ai primi 10 candidati:

| Metodo | 0 hit | 1 hit | 2 hit | 3 hit | 4+ | Media hit/sestina |
|---|---:|---:|---:|---:|---:|---:|
| Baseline | 257 | 111 | 21 | 1 | 0 | 0.4000 |
| P6 pool top-10 | 241 | 128 | 20 | 1 | 0 | 0.4385 |

Differenza: +0.0385 hit/sestina nel sottoinsieme condizionato.

Il risultato è coerente con il segnale rank-level già osservato: quando il precedente P6 era rank 1, la probabilità successiva di avere P6 nel top-10 era superiore al resto. Tuttavia questo test è ancora un impatto condizionato, non una validazione definitiva del metodo.

### P4 — risultato
Condizione precedente P4 rank <=2 verificata in 42 estrazioni.

| Metodo | 0 hit | 1 hit | 2 hit | 3 hit | 4+ | Media hit/sestina |
|---|---:|---:|---:|---:|---:|---:|
| Baseline | 280 | 123 | 17 | 0 | 0 | 0.3738 |
| P4 pool top-10 | 274 | 125 | 20 | 1 | 0 | 0.4000 |

Il semplice test di restrizione del pool P4 ai primi 10 NON conferma un comportamento inverso utile al generatore: nel campione condizionato il risultato migliora invece di peggiorare. Quindi il segnale rank-level negativo di P4 non si traduce automaticamente in una regola di esclusione/restrizione.

### Stato
- P6 persistence: **candidato da mantenere**, non ancora promosso.
- P4 inverse: **nessuna regola operativa derivata**; il test di esclusione semplice non supporta l'ipotesi.
- Produzione: **invariata**.

Nota metodologica: il generatore è quello corrente del repository (pool per posizione, curve empiriche di probabilità, DP, seed deterministico, filtro duplicati e fascia di rank medio plausibile). Il test P6 usa una soglia fissata ex ante (precedente rank <=1) e non la riottimizza sul holdout.
