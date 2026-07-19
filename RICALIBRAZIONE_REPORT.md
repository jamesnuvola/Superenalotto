# Report di ricalibrazione automatica — 2026-07-19

Estrazioni analizzate: 2886. Campione di test per il rank isolato: ultime 1200.

**Importante:** questo report testa SOLO il rank isolato (veloce, eseguibile periodicamente). La sessione di ricerca ha mostrato più volte che un miglioramento qui NON garantisce un miglioramento nella costruzione reale delle sestine (test difficile) — a volte lo ribalta. **Ogni candidato qui sotto va verificato end-to-end in una sessione dedicata prima di essere adottato, mai applicato automaticamente.**

## Nessun candidato promettente trovato in questo ciclo

Nessuna variante testata ha mostrato un miglioramento statisticamente significativo (|z| > 1.96) in almeno 4 posizioni su 6 senza peggiorare nessuna. I parametri attuali restano i migliori conosciuti su questo dataset.


## Dettaglio completo di tutte le varianti testate in questo ciclo

- **hotWindow=5**: migliora in 3/6 posizioni (z per posizione: -1.18, 0.29, -0.48, 2.12, -0.16, 1.68)
- **hotWindow=15**: migliora in 4/6 posizioni (z per posizione: 0.66, 0.16, -0.54, 0.16, -0.32, 1.70)
- **hotWindow=20**: migliora in 5/6 posizioni (z per posizione: 1.67, 0.40, 0.75, 0.14, -0.59, 3.67)
- **decadeWindow=15**: migliora in 4/6 posizioni (z per posizione: -1.41, 0.96, 0.14, 1.05, -0.31, 2.54)
- **decadeWindow=25**: migliora in 5/6 posizioni (z per posizione: 0.69, 0.51, -1.13, 1.83, 0.30, 2.33)
- **decadeWindow=30**: migliora in 4/6 posizioni (z per posizione: -0.16, 0.15, 0.80, 2.26, -0.77, 2.29)
- **clusterMaxLag=3**: migliora in 6/6 posizioni (z per posizione: 1.90, 0.33, 0.26, 1.34, 0.28, 1.07)
- **clusterMaxLag=7**: migliora in 2/6 posizioni (z per posizione: -0.28, -1.00, 0.00, 0.45, -0.28, 0.58)
- **clusterMaxLag=10**: migliora in 2/6 posizioni (z per posizione: -0.69, -1.26, -0.50, 0.63, -0.24, 0.22)
- **volWindow=15**: migliora in 3/6 posizioni (z per posizione: -1.96, 1.40, 0.00, 1.18, -0.37, 1.73)
- **volWindow=25**: migliora in 5/6 posizioni (z per posizione: -1.15, 0.47, 0.30, 0.26, 0.77, 0.78)
- **coldWindow=5**: migliora in 2/6 posizioni (z per posizione: -2.73, -0.75, -1.13, 1.44, -0.75, 0.13)
- **coldWindow=15**: migliora in 5/6 posizioni (z per posizione: 0.12, 0.49, -0.62, 0.68, 2.14, 1.27)
- **coldWindow=20**: migliora in 4/6 posizioni (z per posizione: -1.53, 0.33, -0.32, 0.10, 1.15, 1.39)
