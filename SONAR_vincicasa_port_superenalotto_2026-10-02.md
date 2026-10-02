# SONAR — VinciCasa → SuperEnalotto port test

Dataset: 2928 estrazioni, target 29/08/2025 → 01/10/2026 (228 target). Tutti i segnali usano solo il prefisso precedente al target.

## Baseline casuale 6/90

- hit medi: 0.400
- P(≥1): 34.714%
- P(≥2): 4.963%
- P(≥3): 0.364%

## Risultati

| Strategia | Hit medi | ≥1 | ≥2 | ≥3 | ≥4 | ≥5 | 6 | B1 | B2 | B3 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| FREQUENCY | 0.390 | 34.2% | 4.4% | 0.4% | 0.00% | 0.000% | 0.000% | 0.408 | 0.368 | 0.395 |
| RETURN | 0.421 | 37.3% | 4.8% | 0.0% | 0.00% | 0.000% | 0.000% | 0.355 | 0.487 | 0.421 |
| TREND | 0.368 | 34.2% | 2.6% | 0.0% | 0.00% | 0.000% | 0.000% | 0.382 | 0.408 | 0.316 |
| LIFECYCLE | 0.360 | 33.3% | 2.6% | 0.0% | 0.00% | 0.000% | 0.000% | 0.382 | 0.395 | 0.303 |
| NUCLEUS | 0.425 | 38.6% | 3.9% | 0.0% | 0.00% | 0.000% | 0.000% | 0.395 | 0.421 | 0.461 |
| RELATION | 0.360 | 32.0% | 3.9% | 0.0% | 0.00% | 0.000% | 0.000% | 0.408 | 0.355 | 0.316 |
| POSITION | 0.452 | 37.7% | 7.5% | 0.0% | 0.00% | 0.000% | 0.000% | 0.395 | 0.474 | 0.487 |
| BALANCED | 0.377 | 34.6% | 3.1% | 0.0% | 0.00% | 0.000% | 0.000% | 0.395 | 0.355 | 0.382 |
| TREND+RELATION | 0.425 | 37.7% | 4.8% | 0.0% | 0.00% | 0.000% | 0.000% | 0.368 | 0.487 | 0.421 |
| TREND+LIFE | 0.360 | 33.3% | 2.6% | 0.0% | 0.00% | 0.000% | 0.000% | 0.382 | 0.395 | 0.303 |
| FREQ+RETURN | 0.390 | 34.2% | 4.4% | 0.4% | 0.00% | 0.000% | 0.000% | 0.408 | 0.368 | 0.395 |
| REGIME_TREND | 0.360 | 33.3% | 2.6% | 0.0% | 0.00% | 0.000% | 0.000% | 0.382 | 0.395 | 0.303 |

## Nota metodologica

Il test misura densità di hit, non dimostra capacità predittiva. Le strategie sono portate nel dominio 6/90 con parametri riscalati dove necessario. Nessun risultato entra nel motore ufficiale. Le strategie che mostrano un vantaggio apparente devono passare un secondo test OOS congelato e confronto con null condizionato.
