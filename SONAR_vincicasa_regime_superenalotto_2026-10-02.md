# SONAR — VinciCasa → SuperEnalotto: regime-conditioned test

Dataset: 2928 estrazioni, target 29/08/2025 → 01/10/2026 (228 target). I regimi sono calcolati esclusivamente dal prefisso precedente a ogni target.

## Baseline casuale 6/90

- hit medi: 0.400
- P(≥1): 34.714%
- P(≥2): 4.963%
- P(≥3): 0.364%

## Regimi

- SUM_HIGH/LOW: somma media ultime 21 estrazioni sopra/sotto la mediana delle somme storiche delle finestre precedenti.
- HIGHNUM_HIGH/LOW: media dei numeri ≥46 nelle ultime 21 estrazioni >=3 / <3.
- REPEAT_HIGH/LOW: sovrapposizione media tra estrazioni consecutive nelle ultime 21 >=0.5 / <0.5 numeri.
- ODD_HIGH/LOW: media dei dispari nelle ultime 21 >=3 / <3.

## Risultati per regime

| Strategia | Regime | N | Hit medi | Δ vs 0.400 | ≥1 | ≥2 | ≥3 |
|---|---|---:|---:|---:|---:|---:|---:|
| FREQUENCY | SUM_LOW | 228 | 0.390 | -0.010 | 34.2% | 4.4% | 0.4% |
| FREQUENCY | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 36.4% | 3.6% | 0.0% |
| FREQUENCY | HIGHNUM_LOW | 173 | 0.387 | -0.013 | 33.5% | 4.6% | 0.6% |
| FREQUENCY | REPEAT_HIGH | 34 | 0.412 | 0.012 | 38.2% | 2.9% | 0.0% |
| FREQUENCY | REPEAT_LOW | 194 | 0.387 | -0.013 | 33.5% | 4.6% | 0.5% |
| FREQUENCY | ODD_HIGH | 99 | 0.374 | -0.026 | 34.3% | 3.0% | 0.0% |
| FREQUENCY | ODD_LOW | 129 | 0.403 | 0.003 | 34.1% | 5.4% | 0.8% |
| RETURN | SUM_LOW | 228 | 0.421 | 0.021 | 37.3% | 4.8% | 0.0% |
| RETURN | HIGHNUM_HIGH | 55 | 0.382 | -0.018 | 32.7% | 5.5% | 0.0% |
| RETURN | HIGHNUM_LOW | 173 | 0.434 | 0.034 | 38.7% | 4.6% | 0.0% |
| RETURN | REPEAT_HIGH | 34 | 0.529 | 0.129 | 44.1% | 8.8% | 0.0% |
| RETURN | REPEAT_LOW | 194 | 0.402 | 0.002 | 36.1% | 4.1% | 0.0% |
| RETURN | ODD_HIGH | 99 | 0.424 | 0.024 | 36.4% | 6.1% | 0.0% |
| RETURN | ODD_LOW | 129 | 0.419 | 0.019 | 38.0% | 3.9% | 0.0% |
| TREND | SUM_LOW | 228 | 0.368 | -0.032 | 34.2% | 2.6% | 0.0% |
| TREND | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 34.5% | 5.5% | 0.0% |
| TREND | HIGHNUM_LOW | 173 | 0.358 | -0.042 | 34.1% | 1.7% | 0.0% |
| TREND | REPEAT_HIGH | 34 | 0.382 | -0.018 | 32.4% | 5.9% | 0.0% |
| TREND | REPEAT_LOW | 194 | 0.366 | -0.034 | 34.5% | 2.1% | 0.0% |
| TREND | ODD_HIGH | 99 | 0.384 | -0.016 | 34.3% | 4.0% | 0.0% |
| TREND | ODD_LOW | 129 | 0.357 | -0.043 | 34.1% | 1.6% | 0.0% |
| LIFECYCLE | SUM_LOW | 228 | 0.360 | -0.040 | 33.3% | 2.6% | 0.0% |
| LIFECYCLE | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 34.5% | 5.5% | 0.0% |
| LIFECYCLE | HIGHNUM_LOW | 173 | 0.347 | -0.053 | 32.9% | 1.7% | 0.0% |
| LIFECYCLE | REPEAT_HIGH | 34 | 0.382 | -0.018 | 32.4% | 5.9% | 0.0% |
| LIFECYCLE | REPEAT_LOW | 194 | 0.356 | -0.044 | 33.5% | 2.1% | 0.0% |
| LIFECYCLE | ODD_HIGH | 99 | 0.374 | -0.026 | 33.3% | 4.0% | 0.0% |
| LIFECYCLE | ODD_LOW | 129 | 0.349 | -0.051 | 33.3% | 1.6% | 0.0% |
| NUCLEUS | SUM_LOW | 228 | 0.425 | 0.025 | 38.6% | 3.9% | 0.0% |
| NUCLEUS | HIGHNUM_HIGH | 55 | 0.455 | 0.055 | 40.0% | 5.5% | 0.0% |
| NUCLEUS | HIGHNUM_LOW | 173 | 0.416 | 0.016 | 38.2% | 3.5% | 0.0% |
| NUCLEUS | REPEAT_HIGH | 34 | 0.588 | 0.188 | 50.0% | 8.8% | 0.0% |
| NUCLEUS | REPEAT_LOW | 194 | 0.397 | -0.003 | 36.6% | 3.1% | 0.0% |
| NUCLEUS | ODD_HIGH | 99 | 0.455 | 0.055 | 40.4% | 5.1% | 0.0% |
| NUCLEUS | ODD_LOW | 129 | 0.403 | 0.003 | 37.2% | 3.1% | 0.0% |
| RELATION | SUM_LOW | 228 | 0.360 | -0.040 | 32.0% | 3.9% | 0.0% |
| RELATION | HIGHNUM_HIGH | 55 | 0.473 | 0.073 | 40.0% | 7.3% | 0.0% |
| RELATION | HIGHNUM_LOW | 173 | 0.324 | -0.076 | 29.5% | 2.9% | 0.0% |
| RELATION | REPEAT_HIGH | 34 | 0.382 | -0.018 | 35.3% | 2.9% | 0.0% |
| RELATION | REPEAT_LOW | 194 | 0.356 | -0.044 | 31.4% | 4.1% | 0.0% |
| RELATION | ODD_HIGH | 99 | 0.404 | 0.004 | 34.3% | 6.1% | 0.0% |
| RELATION | ODD_LOW | 129 | 0.326 | -0.074 | 30.2% | 2.3% | 0.0% |
| POSITION | SUM_LOW | 228 | 0.452 | 0.052 | 37.7% | 7.5% | 0.0% |
| POSITION | HIGHNUM_HIGH | 55 | 0.436 | 0.036 | 36.4% | 7.3% | 0.0% |
| POSITION | HIGHNUM_LOW | 173 | 0.457 | 0.057 | 38.2% | 7.5% | 0.0% |
| POSITION | REPEAT_HIGH | 34 | 0.324 | -0.076 | 29.4% | 2.9% | 0.0% |
| POSITION | REPEAT_LOW | 194 | 0.474 | 0.074 | 39.2% | 8.2% | 0.0% |
| POSITION | ODD_HIGH | 99 | 0.455 | 0.055 | 37.4% | 8.1% | 0.0% |
| POSITION | ODD_LOW | 129 | 0.450 | 0.050 | 38.0% | 7.0% | 0.0% |
| BALANCED | SUM_LOW | 228 | 0.377 | -0.023 | 34.6% | 3.1% | 0.0% |
| BALANCED | HIGHNUM_HIGH | 55 | 0.473 | 0.073 | 40.0% | 7.3% | 0.0% |
| BALANCED | HIGHNUM_LOW | 173 | 0.347 | -0.053 | 32.9% | 1.7% | 0.0% |
| BALANCED | REPEAT_HIGH | 34 | 0.324 | -0.076 | 29.4% | 2.9% | 0.0% |
| BALANCED | REPEAT_LOW | 194 | 0.387 | -0.013 | 35.6% | 3.1% | 0.0% |
| BALANCED | ODD_HIGH | 99 | 0.394 | -0.006 | 36.4% | 3.0% | 0.0% |
| BALANCED | ODD_LOW | 129 | 0.364 | -0.036 | 33.3% | 3.1% | 0.0% |
| TREND+RELATION | SUM_LOW | 228 | 0.425 | 0.025 | 37.7% | 4.8% | 0.0% |
| TREND+RELATION | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 34.5% | 5.5% | 0.0% |
| TREND+RELATION | HIGHNUM_LOW | 173 | 0.434 | 0.034 | 38.7% | 4.6% | 0.0% |
| TREND+RELATION | REPEAT_HIGH | 34 | 0.529 | 0.129 | 44.1% | 8.8% | 0.0% |
| TREND+RELATION | REPEAT_LOW | 194 | 0.407 | 0.007 | 36.6% | 4.1% | 0.0% |
| TREND+RELATION | ODD_HIGH | 99 | 0.434 | 0.034 | 37.4% | 6.1% | 0.0% |
| TREND+RELATION | ODD_LOW | 129 | 0.419 | 0.019 | 38.0% | 3.9% | 0.0% |
| TREND+LIFE | SUM_LOW | 228 | 0.360 | -0.040 | 33.3% | 2.6% | 0.0% |
| TREND+LIFE | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 34.5% | 5.5% | 0.0% |
| TREND+LIFE | HIGHNUM_LOW | 173 | 0.347 | -0.053 | 32.9% | 1.7% | 0.0% |
| TREND+LIFE | REPEAT_HIGH | 34 | 0.382 | -0.018 | 32.4% | 5.9% | 0.0% |
| TREND+LIFE | REPEAT_LOW | 194 | 0.356 | -0.044 | 33.5% | 2.1% | 0.0% |
| TREND+LIFE | ODD_HIGH | 99 | 0.374 | -0.026 | 33.3% | 4.0% | 0.0% |
| TREND+LIFE | ODD_LOW | 129 | 0.349 | -0.051 | 33.3% | 1.6% | 0.0% |
| FREQ+RETURN | SUM_LOW | 228 | 0.390 | -0.010 | 34.2% | 4.4% | 0.4% |
| FREQ+RETURN | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 36.4% | 3.6% | 0.0% |
| FREQ+RETURN | HIGHNUM_LOW | 173 | 0.387 | -0.013 | 33.5% | 4.6% | 0.6% |
| FREQ+RETURN | REPEAT_HIGH | 34 | 0.412 | 0.012 | 38.2% | 2.9% | 0.0% |
| FREQ+RETURN | REPEAT_LOW | 194 | 0.387 | -0.013 | 33.5% | 4.6% | 0.5% |
| FREQ+RETURN | ODD_HIGH | 99 | 0.374 | -0.026 | 34.3% | 3.0% | 0.0% |
| FREQ+RETURN | ODD_LOW | 129 | 0.403 | 0.003 | 34.1% | 5.4% | 0.8% |
| REGIME_TREND | SUM_LOW | 228 | 0.360 | -0.040 | 33.3% | 2.6% | 0.0% |
| REGIME_TREND | HIGHNUM_HIGH | 55 | 0.400 | 0.000 | 34.5% | 5.5% | 0.0% |
| REGIME_TREND | HIGHNUM_LOW | 173 | 0.347 | -0.053 | 32.9% | 1.7% | 0.0% |
| REGIME_TREND | REPEAT_HIGH | 34 | 0.382 | -0.018 | 32.4% | 5.9% | 0.0% |
| REGIME_TREND | REPEAT_LOW | 194 | 0.356 | -0.044 | 33.5% | 2.1% | 0.0% |
| REGIME_TREND | ODD_HIGH | 99 | 0.374 | -0.026 | 33.3% | 4.0% | 0.0% |
| REGIME_TREND | ODD_LOW | 129 | 0.349 | -0.051 | 33.3% | 1.6% | 0.0% |

## Regola di lettura

Questo è uno screening di contesto, non una selezione della strategia migliore. Un eventuale vantaggio in un regime va considerato solo come candidato: il passo successivo è congelare le definizioni dei regimi, verificare su un periodo OOS successivo e confrontare anche la distribuzione rispetto a ticket casuali nello stesso regime. L obiettivo è costruire una mappa "regime → strategia utile" e, dove una strategia fallisce, cercare una strategia complementare invece di forzarla.
