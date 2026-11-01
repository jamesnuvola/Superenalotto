# Report di ricalibrazione automatica — 2026-11-01

Estrazioni analizzate: 2934. Campione di test per il rank isolato: ultime 1200.

**Importante:** questo report testa SOLO il rank isolato (veloce, eseguibile periodicamente). La sessione di ricerca ha mostrato più volte che un miglioramento qui NON garantisce un miglioramento nella costruzione reale delle sestine (test difficile) — a volte lo ribalta. **Ogni candidato qui sotto va verificato end-to-end in una sessione dedicata prima di essere adottato, mai applicato automaticamente.**

## Nessun candidato promettente trovato in questo ciclo

Nessuna variante testata ha mostrato un miglioramento statisticamente significativo (|z| > 1.96) in almeno 4 posizioni su 6 senza peggiorare nessuna. I parametri attuali restano i migliori conosciuti su questo dataset.


## Dettaglio completo di tutte le varianti testate in questo ciclo

- **hotWindow=5**: migliora in 3/6 posizioni (z per posizione: -1.40, 0.43, -0.47, 1.67, -0.30, 1.41)
- **hotWindow=15**: migliora in 3/6 posizioni (z per posizione: 0.40, 0.46, -0.52, -0.32, -0.16, 1.70)
- **hotWindow=20**: migliora in 4/6 posizioni (z per posizione: 1.21, 0.13, 0.87, -0.27, -0.60, 4.13)
- **decadeWindow=15**: migliora in 5/6 posizioni (z per posizione: -1.57, 0.83, 0.57, 0.65, 0.32, 2.06)
- **decadeWindow=25**: migliora in 5/6 posizioni (z per posizione: 0.69, 0.32, -0.58, 1.46, 0.60, 1.83)
- **decadeWindow=30**: migliora in 3/6 posizioni (z per posizione: -0.32, -0.45, 0.97, 1.71, -0.39, 1.85)
- **clusterMaxLag=3**: migliora in 6/6 posizioni (z per posizione: 1.26, 0.90, 0.50, 1.34, 0.58, 0.83)
- **clusterMaxLag=7**: migliora in 2/6 posizioni (z per posizione: -0.28, -1.00, -0.71, 0.45, -0.28, 0.58)
- **clusterMaxLag=10**: migliora in 2/6 posizioni (z per posizione: -0.69, -1.26, -0.73, 0.63, -0.24, 0.45)
- **volWindow=15**: migliora in 3/6 posizioni (z per posizione: -1.96, 1.40, 0.00, 0.78, -0.37, 1.51)
- **volWindow=25**: migliora in 4/6 posizioni (z per posizione: -0.83, 0.00, 0.30, 0.26, 1.29, 1.00)
- **coldWindow=5**: migliora in 2/6 posizioni (z per posizione: -2.69, -0.50, -1.10, 1.41, -0.62, 0.94)
- **coldWindow=15**: migliora in 5/6 posizioni (z per posizione: 0.12, 0.37, -0.84, 0.34, 2.39, 1.39)
- **coldWindow=20**: migliora in 3/6 posizioni (z per posizione: -1.25, 0.22, -0.31, -0.48, 1.15, 1.98)
