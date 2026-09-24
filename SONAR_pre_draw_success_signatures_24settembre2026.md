# SONAR — Firma pre-draw dei successi: persistence per posizione
## 24/09/2026

### Obiettivo
Verificare se la persistenza esiste a livello di singola posizione e se alcune condizioni pre-draw identificano quando il ranking CORE tende a continuare a coprire bene una posizione.

### Metodo
- Dataset: 2.923 estrazioni, fino al 22/09/2026.
- Target: 2.322.
- Ranking CORE ricostruito causalmente dal motore di scoring.
- Per ogni target, il precedente rank di una posizione è calcolato sull'estrazione precedente usando esclusivamente la storia precedente a quella estrazione.
- Successo corrente = actual rank CORE <=10.
- Tre blocchi cronologici: 774 / 774 / 774 target.

### Risultato principale — P6
Condizione: **P6 precedente rank <=1**.

| Blocco | N condizione | P6 top10 dopo | P6 top10 resto | Delta |
|---|---:|---:|---:|---:|
| B1 | 39 | 48.72% | 47.35% | +1.37 pp |
| B2 | 36 | 52.78% | 45.12% | +7.66 pp |
| B3 BLIND | 38 | 50.00% | 41.17% | +8.83 pp |

Il segnale è positivo in tutti e tre i blocchi per `P6 rank precedente <=1 -> P6 rank corrente <=10`. La media rank P6 nel blind è 12.29 nella condizione contro 15.19 nel resto.

Con soglia precedente <=2: B1 +2.86 pp, B2 -0.40 pp, B3 +4.21 pp. La soglia <=1 è quindi più pulita, pur con campione piccolo.

### Profondità del segnale P6 <=1
| Blocco | top10 cond. | top10 resto | top3 cond. | top3 resto | top1 cond. | top1 resto |
|---|---:|---:|---:|---:|---:|---:|
| B1 | 48.72% | 47.35% | 12.82% | 14.15% | 2.56% | 4.63% |
| B2 | 52.78% | 45.12% | 16.67% | 14.91% | 5.56% | 4.20% |
| B3 BLIND | 50.00% | 41.17% | 15.79% | 14.40% | 5.26% | 4.76% |

Interpretazione: il segnale appare soprattutto come persistenza di copertura nella fascia top-10, non come prova di persistenza del top-1.

### Altre posizioni — precedente rank <=2
| Posizione | B1 delta | B2 delta | B3 BLIND delta |
|---|---:|---:|---:|
| P1 | +4.25 pp | -12.66 pp | -0.93 pp |
| P2 | +2.89 pp | +2.57 pp | -1.74 pp |
| P3 | -7.90 pp | +3.77 pp | +1.48 pp |
| P4 | -2.06 pp | -14.15 pp | **-14.91 pp** |
| P5 | +13.35 pp | +7.65 pp | -18.52 pp |
| P6 | +4.98 pp | +0.53 pp | **+5.11 pp** |

P4 mostra un comportamento particolarmente coerente nel secondo e terzo blocco: quando il precedente P4 era rank <=2, il P4 successivo è stato meno spesso nel top10. È un segnale di possibile inversione, non ancora operativo.

P5 mostra forte instabilità e viene considerato non affidabile nel formato attuale.

### Test globale delle firme pre-draw
Sono state testate anche precedente K2/K3/K5, rank medio basso, rank medio Q1, spread alto, P3 DOWN, P4 UP/DOWN, asimmetria P1-P6, divergenza top-1 e combinazioni semplici.

Con selezione cronologica 40% train / 30% validation / 30% blind, nessuna firma globale ha mostrato un vantaggio stabile abbastanza grande da autorizzare un nuovo selettore. P3 DOWN non mantiene il vantaggio nel blind. P4 UP + mean rank low migliora nel blind ma non era positiva nel train. K2/K5 restano troppo rari/intermittenti.

### Cosa salviamo
1. **CANDIDATO POSITIVO:** P6 previous rank <=1 -> P6 current rank <=10. Positivo in 3/3 blocchi; blind +8.83 pp; campione blind 38 casi; promettente ma non provato.
2. **CANDIDATO NEGATIVO/INVERSO:** P4 previous rank <=2 -> P4 current rank <=10. Blind -14.91 pp; B2 -14.15 pp; da verificare come possibile segnale di attenuazione/esclusione.
3. **P5 persistence:** chiusa come candidato instabile nel formato attuale.
4. **P1/P2/P3:** nessuna persistenza abbastanza stabile per promozione.

### Prossimo test obbligatorio
Per P6 rank<=1: congelare la regola; holdout completamente successivo; confronto con baseline P6 top10; rank medio/top5/top3/top1; quindi effetto sul generatore completo con distribuzione 0/1/2/3/4/5/6. Infine verificare combinazioni con P3 DOWN, P6 delay, rank medio e divergenza senza riottimizzare sul blind.

### Stato
**Produzione invariata.** P6 rank<=1 è un candidato promettente ma non provato. P4 rank<=2 è un candidato inverso da verificare. Nessuna promozione.
