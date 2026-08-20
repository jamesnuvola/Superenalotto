# Report di ricalibrazione automatica — 2026-08-20

Estrazioni analizzate: 2903. Campione di test per il rank isolato: ultime 1200.

**Importante:** questo report testa SOLO il rank isolato (veloce, eseguibile periodicamente). La sessione di ricerca ha mostrato più volte che un miglioramento qui NON garantisce un miglioramento nella costruzione reale delle sestine (test difficile) — a volte lo ribalta. **Ogni candidato qui sotto va verificato end-to-end in una sessione dedicata prima di essere adottato, mai applicato automaticamente.**

## Nessun candidato promettente trovato in questo ciclo

Nessuna variante testata ha mostrato un miglioramento statisticamente significativo (|z| > 1.96) in almeno 4 posizioni su 6 senza peggiorare nessuna. I parametri attuali restano i migliori conosciuti su questo dataset.


## Dettaglio completo di tutte le varianti testate in questo ciclo

- **hotWindow=5**: migliora in 3/6 posizioni (z per posizione: -1.18, 0.29, -0.80, 1.98, -0.31, 1.54)
- **hotWindow=15**: migliora in 4/6 posizioni (z per posizione: 0.66, 0.60, -0.35, 0.16, -0.16, 1.70)
- **hotWindow=20**: migliora in 5/6 posizioni (z per posizione: 1.57, 0.53, 0.88, 0.14, -0.60, 3.67)
- **decadeWindow=15**: migliora in 4/6 posizioni (z per posizione: -1.41, 0.83, 0.28, 0.93, -0.16, 2.54)
- **decadeWindow=25**: migliora in 5/6 posizioni (z per posizione: 0.69, 0.33, -0.96, 1.67, 0.46, 2.19)
- **decadeWindow=30**: migliora in 3/6 posizioni (z per posizione: -0.16, -0.30, 1.15, 2.26, -0.65, 2.16)
- **clusterMaxLag=3**: migliora in 6/6 posizioni (z per posizione: 1.90, 0.63, 0.26, 1.34, 0.28, 0.83)
- **clusterMaxLag=7**: migliora in 2/6 posizioni (z per posizione: -0.28, -1.00, 0.00, 0.45, -0.28, 0.58)
- **clusterMaxLag=10**: migliora in 2/6 posizioni (z per posizione: -0.69, -1.26, -0.50, 0.63, -0.24, 0.22)
- **volWindow=15**: migliora in 3/6 posizioni (z per posizione: -1.96, 1.40, 0.00, 1.18, -0.37, 1.73)
- **volWindow=25**: migliora in 5/6 posizioni (z per posizione: -1.15, 0.47, 0.30, 0.26, 1.07, 0.78)
- **coldWindow=5**: migliora in 2/6 posizioni (z per posizione: -2.49, -0.74, -0.88, 1.57, -0.63, 0.27)
- **coldWindow=15**: migliora in 5/6 posizioni (z per posizione: 0.23, 0.50, -0.61, 0.46, 2.29, 1.39)
- **coldWindow=20**: migliora in 3/6 posizioni (z per posizione: -1.25, 0.33, -0.21, 0.00, 1.04, 1.69)
