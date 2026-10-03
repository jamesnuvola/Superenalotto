# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**
Target dataset: **SuperEnalotto**
Run: 2026-10-03T12:49:24.225Z
DOT agents processed: 16
DOT agents remaining: 544
Next DOT: e2927:highnum:HIGH:TREND+FREQ

## Persistent DOT model

Each DOT is a persistent research agent identified by **historical window + context + strategy**. A completed DOT is never silently repeated. The queue advances through the latest window and then progressively older windows, preserving every result. A new draw creates a new latest-window frontier without deleting previous work.

## Nodi processati

| DOT | Finestra | Casi | ≥3 | ≥4 | ≥5 | 6/6 | Stato |
|---|---|---:|---:|---:|---:|---:|---|
| e2927:highnum:HIGH:TREND+FREQ | 2700–2927 | 55 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:HIGH:FREQ+RETURN | 2700–2927 | 55 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:LOW:FREQUENCY | 2700–2927 | 173 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:LOW:RETURN | 2700–2927 | 173 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:LOW:TREND | 2700–2927 | 173 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:LOW:POSITION | 2700–2927 | 173 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:LOW:TREND+FREQ | 2700–2927 | 173 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:highnum:LOW:FREQ+RETURN | 2700–2927 | 173 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:HIGH:FREQUENCY | 2700–2927 | 99 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:HIGH:RETURN | 2700–2927 | 99 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:HIGH:TREND | 2700–2927 | 99 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:HIGH:POSITION | 2700–2927 | 99 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:HIGH:TREND+FREQ | 2700–2927 | 99 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:HIGH:FREQ+RETURN | 2700–2927 | 99 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:LOW:FREQUENCY | 2700–2927 | 129 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2927:odd:LOW:RETURN | 2700–2927 | 129 | 0 | 0 | 0 | 0 | DISCOVERED |

## Regola metodologica

Un DOT non dimostra una regola universale. I risultati ≥3 hit vengono conservati per cercare contesti simili e ripetibili; i 4/5 hit generano analisi del residuo e strategie complementari. DISCOVERED non significa validato: la promozione richiede definizione congelata, OOS e null condizionato. I fallimenti restano nel registro.
