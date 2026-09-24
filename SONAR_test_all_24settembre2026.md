# SONAR — Batteria completa test P6/P4 persistence
## 24 settembre 2026

Questo documento registra il test di impatto sul generatore eseguito dopo il test pre-draw delle signature.

### Test eseguiti

1. P6 persistence congelata: precedente P6 rank <=1.
2. Impatto sul generatore: P6 pool standard 19 -> 10 candidati.
3. P4 persistence/inversione: precedente P4 rank <=2.
4. Impatto sul generatore: P4 pool standard 40 -> 10 candidati.

Holdout cronologico: target 2149–2923, 775 estrazioni. Nessuna soglia è stata riottimizzata sull'holdout.

### Risultati P6

Condizione: precedente P6 rank <=1, 39/775 target.

Baseline, 390 sestine:
0 hit 257; 1 hit 111; 2 hit 21; 3 hit 1; 4-6 hit 0.
Media: 0.4000 hit/sestina.

P6 pool top-10, 390 sestine:
0 hit 241; 1 hit 128; 2 hit 20; 3 hit 1; 4-6 hit 0.
Media: 0.43846 hit/sestina.

Differenza: +0.03846 hit/sestina nel sottoinsieme condizionato.

### Risultati P4

Condizione: precedente P4 rank <=2, 42 target.

Baseline, 420 sestine:
0 hit 280; 1 hit 123; 2 hit 17; 3-6 hit 0.
Media: 0.37381.

P4 pool top-10, 420 sestine:
0 hit 274; 1 hit 125; 2 hit 20; 3 hit 1; 4-6 hit 0.
Media: 0.40000.

Il risultato non supporta una semplice regola di esclusione P4.

### Decisione
P6 resta candidato da testare ulteriormente con controlli di robustezza, interazioni congelate e null/permutazioni. P4 non viene trasformato in una regola operativa.

Produzione invariata.
