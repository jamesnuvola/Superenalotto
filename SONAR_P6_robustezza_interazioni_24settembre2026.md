# SONAR — P6 persistence: batteria di robustezza e interazioni
## 24 settembre 2026

### Obiettivo
Spremere il candidato congelato **P6 precedente rank <=1** per capire se l'informazione conserva valore quando combinata con segnali già studiati, senza riottimizzare la soglia.

### Dati e metodo
Dataset corrente: 2.923 estrazioni, fino al 22/09/2026.
Per le analisi di ranking è stata ricostruita causalmente la classifica CORE dal codice corrente `src/engine/scoring.js`.
Holdout principale: target 2149–2923, 775 estrazioni.
La condizione P6<=1 è quella già congelata nel test precedente.

---

## 1. P6<=1: conferma sul blocco 2149–2923

Nel blocco 2149–2923 la condizione si verifica in **38/775** target.

A livello di rank P6:
- P6 top-10 nella condizione: **47.37%** circa
- differenza rispetto al resto: **+3.78 pp**
- P6 top-3 e top-1 restano molto più rumorosi.

Nota: questo blocco non coincide con la precedente suddivisione in tre blocchi 774/774/774 usata per scoprire il segnale. È quindi un controllo cronologico successivo, non una replica identica della tabella precedente.

---

## 2. Interazioni congelate

### P6<=1 + P3 DOWN
Definizione P3 DOWN: rank P3 della precedente estrazione migliore (più basso) del rank P3 della penultima.

- 21 target nel blocco 2149–2923.
- Generator-impact diagnostico ricostruito: +0.0143 hit/sestina.
- Il sottoinsieme è piccolo; non sufficiente per promozione.

### P6<=1 + precedente mean-rank basso
- 22 target.
- generator-impact diagnostico: +0.0045 hit/sestina.
- Effetto praticamente nullo nella ricostruzione.

### P6<=1 + precedente mean-rank Q1
- 14 target.
- generator-impact diagnostico: +0.0429 hit/sestina.
- Campione troppo piccolo e combinazione più selettiva; candidato interessante ma non validato.

### P6<=1 + top-1 divergence
Nel blocco analizzato la condizione di divergenza >=4 top-1 è risultata sostanzialmente sovrapposta alla condizione P6<=1 nel campione disponibile. Non aggiunge quindi informazione indipendente misurabile in questo test.

### P6<=1 + P6 delay 20–40
Non è stato forzato un risultato: il report storico non contiene una definizione sufficientemente precisa e riproducibile di quale “delay P6” debba essere usato nella combinazione. In particolare non è corretto sostituirlo arbitrariamente con il delay del top-ranked P6 candidato. Questo test resta quindi **da eseguire quando la definizione esatta del segnale viene recuperata**.

---

## 3. Null / permutazione

Per P6<=1 è stata mantenuta la prevalenza osservata (38 casi su 775) e randomizzata la posizione temporale della condizione per 2.000 permutazioni.

Effetto osservato sulla percentuale P6 top-10:
**+3.78 punti percentuali**.

Permutazioni almeno altrettanto favorevoli:
**664 / 2.000**.

p empirico one-sided:
**0.332**.

Questo controllo non fornisce evidenza statistica sufficiente per attribuire il +3.78 pp del blocco successivo a una dipendenza temporale stabile. È però coerente con il fatto che il segnale precedente merita di essere conservato come candidato, non come regola già dimostrata.

---

## 4. Impatto sul generatore — importante controllo metodologico

È stata tentata una ricostruzione indipendente del generatore corrente, con pool P6 19 -> 10 e le curve empiriche presenti in `multigen.js`.

La ricostruzione produce risultati generator-level molto diversi dal precedente test registrato:
- precedente test verificato nel report `SONAR_P6_P4_generator_impact_24settembre2026.md`: baseline **0.4000**, P6 TOP-10 **0.43846**, delta **+0.03846**;
- questa nuova ricostruzione non replica quel livello di hit.

Conclusione: **il nuovo output generator-level non viene usato come evidenza** e non sostituisce il test precedente. Questo è esattamente il tipo di controllo di parità che dobbiamo mantenere per evitare di promuovere un risultato prodotto da una ricostruzione imperfetta.

Il precedente impatto generator-level resta quindi registrato come risultato diagnostico già ottenuto, ma non ancora confermato da una seconda implementazione indipendente.

---

## 5. Stato del candidato P6

### Da conservare
**P6 persistence — previous P6 CORE rank <=1 -> current P6 CORE rank <=10.**

Evidenze già disponibili:
1. segno positivo in tutti i 3 blocchi cronologici della discovery;
2. blind finale della discovery: **+8.83 pp**;
3. holdout successivo 2149–2923: segnale ancora positivo, ma ridotto a circa **+3.78 pp**;
4. primo test generator-level registrato: **+0.03846 hit/sestina** nel sottoinsieme condizionato.

### Da NON fare
- non trasformare P6<=1 in selettore autonomo;
- non restringere ulteriormente P6 sulla base del risultato Q1;
- non promuovere P3 DOWN come combinazione;
- non usare il nuovo generator-level ricostruito finché non viene ristabilita la parità esatta con il generatore di produzione.

### Prossimo test obbligatorio
Recuperare la definizione esatta del segnale **P6 delay 20–40**, poi eseguire:
1. P6<=1 alone;
2. P6<=1 + delay20–40;
3. P6<=1 + P3 DOWN + delay20–40;
4. rolling discovery/validation/blind;
5. generatore esatto di produzione;
6. distribuzione completa 0/1/2/3/4/5/6;
7. null temporale con prevalenza preservata.

### Decisione
**P6<=1 resta un candidato congelato per la costruzione della sestina. Produzione invariata.**
