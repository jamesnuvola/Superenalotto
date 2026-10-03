# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T15:49:37.329Z  
DOTs processed: **16**  
DOTs remaining: **312**  
Next DOT: **C:e2699:sum:HIGH:RETURN**

## Architecture

Each DOT is a persistent research agent. It executes once, stores evidence, and is never silently repeated. New draws create a new latest-window frontier while previous evidence remains.

## Parallel tracks

- **Conditional discovery:** find when a rule works and when it fails.
- **6/6 Hunter:** search historical 6/6 conditions directly, independently of 3/4/5-hit paths.
- **Condition analysis:** ≥3 findings spawn child DOTs that compare success contexts with nearby failures.

## Recent DOTs

| DOT | Type | Window | Cases/Successes | ≥3 | ≥4 | ≥5 | 6/6 | Status |
|---|---|---|---:|---:|---:|---:|---:|---|
| e1559:repeat:LOW:FREQUENCY | DISCOVERY | 1332–1559 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1559:repeat:LOW:RETURN | DISCOVERY | 1332–1559 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1559:repeat:LOW:TREND | DISCOVERY | 1332–1559 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1559:repeat:LOW:POSITION | DISCOVERY | 1332–1559 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1559:repeat:LOW:TREND+FREQ | DISCOVERY | 1332–1559 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1559:repeat:LOW:FREQ+RETURN | DISCOVERY | 1332–1559 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1559:6HUNTER | 6HUNTER | 1332–1559 | 0 | - | - | - | 0 | NO_DIRECT_6_6 |
| e1331:sum:HIGH:FREQUENCY | DISCOVERY | 1104–1331 | 115 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:HIGH:RETURN | DISCOVERY | 1104–1331 | 115 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:HIGH:TREND | DISCOVERY | 1104–1331 | 115 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:HIGH:POSITION | DISCOVERY | 1104–1331 | 115 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:HIGH:TREND+FREQ | DISCOVERY | 1104–1331 | 115 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:HIGH:FREQ+RETURN | DISCOVERY | 1104–1331 | 115 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:LOW:FREQUENCY | DISCOVERY | 1104–1331 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:LOW:RETURN | DISCOVERY | 1104–1331 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:sum:LOW:TREND | DISCOVERY | 1104–1331 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
