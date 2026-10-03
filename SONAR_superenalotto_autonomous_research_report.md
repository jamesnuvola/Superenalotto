# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**
Target dataset: **SuperEnalotto**
Run: 2026-10-03T12:34:49.356Z
Target window: 29/08/2025 → 01/10/2026
Nodi processati: 16
Nodi residui: 32

## Regola metodologica

Il motore non cerca una regola universale e non promuove una strategia sulla sola media. Ogni nodo è **contesto → strategia → evento**. Gli eventi con ≥3 hit vengono conservati; per 4/5 hit viene inoltre calcolato il residuo e cercata la strategia complementare che copre quel residuo. Il 6/6 è registrato come evento speciale.

## Nodi processati

| Nodo | Casi | ≥3 | ≥4 | ≥5 | 6/6 | Stato |
|---|---:|---:|---:|---:|---:|---|
| sum:HIGH:FREQUENCY | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:HIGH:RETURN | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:HIGH:TREND | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:HIGH:POSITION | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:HIGH:TREND+FREQ | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:HIGH:FREQ+RETURN | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:LOW:FREQUENCY | 228 | 1 | 0 | 0 | 0 | DISCOVERED |
| sum:LOW:RETURN | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:LOW:TREND | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:LOW:POSITION | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:LOW:TREND+FREQ | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| sum:LOW:FREQ+RETURN | 228 | 1 | 0 | 0 | 0 | DISCOVERED |
| highnum:HIGH:FREQUENCY | 55 | 0 | 0 | 0 | 0 | DISCOVERED |
| highnum:HIGH:RETURN | 55 | 0 | 0 | 0 | 0 | DISCOVERED |
| highnum:HIGH:TREND | 55 | 0 | 0 | 0 | 0 | DISCOVERED |
| highnum:HIGH:POSITION | 55 | 0 | 0 | 0 | 0 | DISCOVERED |

## Promozione

DISCOVERED non significa validato. Un candidato passa a FROZEN solo quando la definizione è congelata; quindi deve affrontare OOS e null condizionato nello stesso contesto. Solo dopo può essere marcato OOS_PASS. I fallimenti restano nel registro e non vengono cancellati.
