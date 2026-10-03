# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T15:56:08.732Z  
DOTs processed: **16**  
DOTs remaining: **219**  
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
| e875:sum:LOW:RETURN | DISCOVERY | 648–875 | 113 | 2 | 0 | 0 | 0 | DISCOVERED |
| e875:sum:LOW:TREND | DISCOVERY | 648–875 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:sum:LOW:POSITION | DISCOVERY | 648–875 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:sum:LOW:TREND+FREQ | DISCOVERY | 648–875 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:sum:LOW:FREQ+RETURN | DISCOVERY | 648–875 | 113 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:HIGH:FREQUENCY | DISCOVERY | 648–875 | 147 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:HIGH:RETURN | DISCOVERY | 648–875 | 147 | 3 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:HIGH:TREND | DISCOVERY | 648–875 | 147 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:HIGH:POSITION | DISCOVERY | 648–875 | 147 | 2 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:HIGH:TREND+FREQ | DISCOVERY | 648–875 | 147 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:HIGH:FREQ+RETURN | DISCOVERY | 648–875 | 147 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:LOW:FREQUENCY | DISCOVERY | 648–875 | 81 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:LOW:RETURN | DISCOVERY | 648–875 | 81 | 1 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:LOW:TREND | DISCOVERY | 648–875 | 81 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:LOW:POSITION | DISCOVERY | 648–875 | 81 | 0 | 0 | 0 | 0 | DISCOVERED |
| e875:highnum:LOW:TREND+FREQ | DISCOVERY | 648–875 | 81 | 0 | 0 | 0 | 0 | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
