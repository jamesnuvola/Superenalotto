# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T15:43:01.802Z  
DOTs processed: **16**  
DOTs remaining: **494**  
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
| e2699:repeat:LOW:FREQ+RETURN | DISCOVERY | 2472–2699 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:6HUNTER | 6HUNTER | 2472–2699 | 0 | - | - | - | 0 | NO_DIRECT_6_6 |
| e2471:sum:HIGH:FREQUENCY | DISCOVERY | 2244–2471 | 134 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:HIGH:RETURN | DISCOVERY | 2244–2471 | 134 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:HIGH:TREND | DISCOVERY | 2244–2471 | 134 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:HIGH:POSITION | DISCOVERY | 2244–2471 | 134 | 2 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:HIGH:TREND+FREQ | DISCOVERY | 2244–2471 | 134 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:HIGH:FREQ+RETURN | DISCOVERY | 2244–2471 | 134 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:LOW:FREQUENCY | DISCOVERY | 2244–2471 | 94 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:LOW:RETURN | DISCOVERY | 2244–2471 | 94 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:LOW:TREND | DISCOVERY | 2244–2471 | 94 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:LOW:POSITION | DISCOVERY | 2244–2471 | 94 | 2 | 1 | 0 | 0 | DISCOVERED |
| e2471:sum:LOW:TREND+FREQ | DISCOVERY | 2244–2471 | 94 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2471:sum:LOW:FREQ+RETURN | DISCOVERY | 2244–2471 | 94 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2471:highnum:HIGH:FREQUENCY | DISCOVERY | 2244–2471 | 173 | 1 | 0 | 0 | 0 | DISCOVERED |
| e2471:highnum:HIGH:RETURN | DISCOVERY | 2244–2471 | 173 | 1 | 0 | 0 | 0 | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
