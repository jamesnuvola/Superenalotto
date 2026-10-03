# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T15:42:32.132Z  
DOTs processed: **16**  
DOTs remaining: **502**  
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
| e2699:odd:LOW:RETURN | DISCOVERY | 2472–2699 | 70 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:odd:LOW:TREND | DISCOVERY | 2472–2699 | 70 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:odd:LOW:POSITION | DISCOVERY | 2472–2699 | 70 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:odd:LOW:TREND+FREQ | DISCOVERY | 2472–2699 | 70 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:odd:LOW:FREQ+RETURN | DISCOVERY | 2472–2699 | 70 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:HIGH:FREQUENCY | DISCOVERY | 2472–2699 | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:HIGH:RETURN | DISCOVERY | 2472–2699 | 228 | 2 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:HIGH:TREND | DISCOVERY | 2472–2699 | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:HIGH:POSITION | DISCOVERY | 2472–2699 | 228 | 2 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:HIGH:TREND+FREQ | DISCOVERY | 2472–2699 | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:HIGH:FREQ+RETURN | DISCOVERY | 2472–2699 | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:LOW:FREQUENCY | DISCOVERY | 2472–2699 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:LOW:RETURN | DISCOVERY | 2472–2699 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:LOW:TREND | DISCOVERY | 2472–2699 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:LOW:POSITION | DISCOVERY | 2472–2699 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |
| e2699:repeat:LOW:TREND+FREQ | DISCOVERY | 2472–2699 | 0 | 0 | 0 | 0 | 0 | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
