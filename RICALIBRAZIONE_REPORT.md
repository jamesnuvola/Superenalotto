# Report di ricalibrazione automatica — 2026-10-01

Estrazioni analizzate: 2927. Campione di test per il rank isolato: ultime 1200.

**Importante:** questo report testa SOLO il rank isolato (veloce, eseguibile periodicamente). La sessione di ricerca ha mostrato più volte che un miglioramento qui NON garantisce un miglioramento nella costruzione reale delle sestine (test difficile) — a volte lo ribalta. **Ogni candidato qui sotto va verificato end-to-end in una sessione dedicata prima di essere adottato, mai applicato automaticamente.**

## Nessun candidato promettente trovato in questo ciclo

Nessuna variante testata ha mostrato un miglioramento statisticamente significativo (|z| > 1.96) in almeno 4 posizioni su 6 senza peggiorare nessuna. I parametri attuali restano i migliori conosciuti su questo dataset.


## Dettaglio completo di tutte le varianti testate in questo ciclo

- **hotWindow=5**: migliora in 3/6 posizioni (z per posizione: -1.40, 0.28, -0.63, 1.67, -0.46, 1.41)
- **hotWindow=15**: migliora in 3/6 posizioni (z per posizione: 0.40, 0.46, -0.35, -0.32, 0.00, 1.70)
- **hotWindow=20**: migliora in 4/6 posizioni (z per posizione: 1.21, 0.13, 1.02, -0.27, -0.45, 4.01)
- **decadeWindow=15**: migliora in 5/6 posizioni (z per posizione: -1.57, 0.83, 0.42, 0.65, 0.16, 2.26)
- **decadeWindow=25**: migliora in 5/6 posizioni (z per posizione: 0.69, 0.32, -0.58, 1.46, 0.46, 2.04)
- **decadeWindow=30**: migliora in 3/6 posizioni (z per posizione: -0.49, -0.45, 1.15, 1.71, -0.66, 2.03)
- **clusterMaxLag=3**: migliora in 6/6 posizioni (z per posizione: 1.26, 0.90, 0.50, 1.34, 0.28, 0.83)
- **clusterMaxLag=7**: migliora in 2/6 posizioni (z per posizione: -0.28, -1.00, -0.38, 0.45, -0.28, 0.58)
- **clusterMaxLag=10**: migliora in 2/6 posizioni (z per posizione: -0.69, -1.26, -0.50, 0.63, -0.50, 0.45)
- **volWindow=15**: migliora in 3/6 posizioni (z per posizione: -1.96, 1.40, 0.00, 0.78, -0.37, 1.73)
- **volWindow=25**: migliora in 4/6 posizioni (z per posizione: -1.15, 0.00, 0.30, 0.26, 1.07, 1.00)
- **coldWindow=5**: migliora in 2/6 posizioni (z per posizione: -2.69, -0.50, -0.98, 1.41, -0.88, 0.94)
- **coldWindow=15**: migliora in 4/6 posizioni (z per posizione: -0.12, 0.37, -0.86, 0.34, 2.18, 1.39)
- **coldWindow=20**: migliora in 3/6 posizioni (z per posizione: -1.44, 0.22, -0.31, -0.38, 0.93, 1.98)
