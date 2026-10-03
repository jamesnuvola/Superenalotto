# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T15:53:54.689Z  
DOTs processed: **16**  
DOTs remaining: **289**  
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
| e1331:odd:HIGH:RETURN | DISCOVERY | 1104–1331 | 108 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:HIGH:TREND | DISCOVERY | 1104–1331 | 108 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:HIGH:POSITION | DISCOVERY | 1104–1331 | 108 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:HIGH:TREND+FREQ | DISCOVERY | 1104–1331 | 108 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:HIGH:FREQ+RETURN | DISCOVERY | 1104–1331 | 108 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:LOW:FREQUENCY | DISCOVERY | 1104–1331 | 120 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:LOW:RETURN | DISCOVERY | 1104–1331 | 120 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:LOW:TREND | DISCOVERY | 1104–1331 | 120 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:LOW:POSITION | DISCOVERY | 1104–1331 | 120 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:LOW:TREND+FREQ | DISCOVERY | 1104–1331 | 120 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:odd:LOW:FREQ+RETURN | DISCOVERY | 1104–1331 | 120 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:repeat:HIGH:FREQUENCY | DISCOVERY | 1104–1331 | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:repeat:HIGH:RETURN | DISCOVERY | 1104–1331 | 228 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:repeat:HIGH:TREND | DISCOVERY | 1104–1331 | 228 | 1 | 0 | 0 | 0 | DISCOVERED |
| e1331:repeat:HIGH:POSITION | DISCOVERY | 1104–1331 | 228 | 0 | 0 | 0 | 0 | DISCOVERED |
| e1331:repeat:HIGH:TREND+FREQ | DISCOVERY | 1104–1331 | 228 | 1 | 0 | 0 | 0 | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
