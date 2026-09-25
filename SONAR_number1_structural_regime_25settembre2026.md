# SONAR — 1 → struttura → cambio regime

Dataset 2924; target causali 800–2923. Tutte le feature del target sono calcolate con storia precedente.

## Condizione prev1
N=50 vs rest=799; rm 21.357 vs 22.354; k2 0.440 vs 0.384; top10 2.060 vs 1.783
N=39 vs rest=598; rm 20.957 vs 21.948; k2 0.256 vs 0.376; top10 1.846 vs 1.773
N=42 vs rest=596; rm 21.226 vs 22.862; k2 0.452 vs 0.386; top10 2.071 vs 1.827
## Condizione prev3
N=0 vs rest=849; rm 0.000 vs 22.295; k2 0.000 vs 0.388; top10 0.000 vs 1.800
N=0 vs rest=637; rm 0.000 vs 21.887; k2 0.000 vs 0.369; top10 0.000 vs 1.777
N=0 vs rest=638; rm 0.000 vs 22.755; k2 0.000 vs 0.390; top10 0.000 vs 1.843

## Differenze strutturali: condizione precedente vs resto
- rm: B1 -0.9975, B2 -0.9909, B3 blind -1.6362
- k2: B1 0.0558, B2 -0.1198, B3 blind 0.0665
- k5: B1 0.0701, B2 -0.0753, B3 blind 0.1083
- spread: B1 0.5338, B2 -2.1856, B3 blind 1.7612
- sum: B1 0.8775, B2 -4.3216, B3 blind -7.2547
- low: B1 0.0013, B2 0.1159, B3 blind 0.2927
- mid: B1 0.0712, B2 0.0769, B3 blind -0.3776
- high: B1 -0.0725, B2 -0.1929, B3 blind 0.0849
- odd: B1 -0.0687, B2 0.1656, B3 blind 0.4319
- g1: B1 -0.0492, B2 0.1143, B3 blind -0.0344
- top3: B1 0.0855, B2 -0.1656, B3 blind -0.0296
- top10: B1 0.2765, B2 0.0736, B3 blind 0.2442
- drm: B1 -4.4568, B2 -0.1866, B3 blind -1.0104
- dk2: B1 0.2563, B2 -0.3004, B3 blind 0.2022
- dt10: B1 0.4500, B2 -0.1622, B3 blind 0.0459
- dspread: B1 -9.3219, B2 -11.4476, B3 blind -10.5887
- dsum: B1 56.7390, B2 41.5301, B3 blind 18.5053
- dhigh: B1 0.4250, B2 0.2168, B3 blind 0.0527
- dlow: B1 -0.8701, B2 -0.3824, B3 blind 0.0238
- prev_rm: B1 3.4593, B2 -0.8043, B3 blind -0.6258
- prev_k2: B1 -0.2005, B2 0.1806, B3 blind -0.1357
- prev_spread: B1 9.8557, B2 9.2620, B3 blind 12.3499
- prev_high: B1 -0.4976, B2 -0.4097, B3 blind 0.0322
- prev_low: B1 0.8714, B2 0.4983, B3 blind 0.2689
- prev_top10: B1 -0.1735, B2 0.2358, B3 blind 0.1983
- prev_top3: B1 -0.1920, B2 0.1076, B3 blind -0.1553

## Cambio di regime: correlazioni feature t-1 → variazione t
- rm→drm: 0.711 / 0.697 / 0.731
- rm→dk2: -0.272 / -0.154 / -0.283
- rm→dspread: -0.256 / -0.160 / -0.222
- rm→dhigh: 0.016 / 0.045 / 0.133
- rm→dlow: 0.085 / 0.067 / 0.021
- rm→dt10: -0.445 / -0.464 / -0.502
- k2→drm: -0.176 / -0.226 / -0.182
- k2→dk2: 0.691 / 0.725 / 0.718
- k2→dspread: 0.102 / 0.161 / 0.128
- k2→dt10: 0.224 / 0.286 / 0.269
- spread→drm: -0.279 / -0.188 / -0.250
- spread→dk2: 0.127 / 0.105 / 0.158
- spread→dspread: 0.716 / 0.695 / 0.698
- spread→dhigh: 0.188 / 0.128 / 0.118
- spread→dlow: 0.119 / 0.230 / 0.190
- spread→dt10: 0.271 / 0.174 / 0.317
- sum→dsum: 0.696 / 0.720 / 0.701
- sum→dhigh: 0.547 / 0.576 / 0.582
- sum→dlow: -0.596 / -0.578 / -0.582
- high→drm: -0.004 / 0.030 / 0.110
- high→dspread: 0.119 / 0.167 / 0.090
- high→dsum: 0.580 / 0.551 / 0.574
- high→dhigh: 0.704 / 0.715 / 0.714
- high→dlow: -0.378 / -0.301 / -0.371
- low→drm: 0.087 / 0.093 / -0.016
- low→dspread: 0.179 / 0.222 / 0.179
- low→dsum: -0.551 / -0.570 / -0.568
- low→dhigh: -0.312 / -0.314 / -0.366
- low→dlow: 0.697 / 0.716 / 0.699
- top10→drm: -0.465 / -0.437 / -0.424
- top10→dk2: 0.299 / 0.230 / 0.343
- top10→dspread: 0.249 / 0.159 / 0.199
- top10→dt10: 0.714 / 0.705 / 0.709

## Regime transitions conditioned on previous 1
K2>=0: prev1 n=50 rate=0.059; rest n=799
K2>=1: prev1 n=15 rate=0.018; rest n=269
K2>=2: prev1 n=7 rate=0.008; rest n=36
K2>=0: prev1 n=39 rate=0.061; rest n=598
K2>=1: prev1 n=10 rate=0.016; rest n=195
K2>=0: prev1 n=42 rate=0.066; rest n=596
K2>=1: prev1 n=13 rate=0.020; rest n=191
K2>=2: prev1 n=5 rate=0.008; rest n=35
