# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T16:00:03.747Z  
DOTs processed: **16**  
DOTs remaining: **92**  
Next DOT: **C:e2471:highnum:HIGH:FREQ+RETURN**

## Architecture

Each DOT is a persistent research agent. It executes once, stores evidence, and is never silently repeated. New draws create a new latest-window frontier while previous evidence remains.

## Parallel tracks

- **Conditional discovery:** find when a rule works and when it fails.
- **6/6 Hunter:** search historical 6/6 conditions directly, independently of 3/4/5-hit paths.
- **Condition analysis:** ≥3 findings spawn child DOTs that compare success contexts with nearby failures.

## Recent DOTs

| DOT | Type | Window | Cases/Successes | ≥3 | ≥4 | ≥5 | 6/6 | Status |
|---|---|---|---:|---:|---:|---:|---:|---|
| C:e2699:highnum:LOW:RETURN | CONDITION_ANALYSIS | 2472–2699 | 2 | - | - | - | - | DISCOVERED |
| C:e2699:highnum:LOW:POSITION | CONDITION_ANALYSIS | 2472–2699 | 1 | - | - | - | - | DISCOVERED |
| C:e2699:odd:HIGH:RETURN | CONDITION_ANALYSIS | 2472–2699 | 2 | - | - | - | - | DISCOVERED |
| C:e2699:odd:HIGH:POSITION | CONDITION_ANALYSIS | 2472–2699 | 2 | - | - | - | - | DISCOVERED |
| C:e2699:repeat:HIGH:RETURN | CONDITION_ANALYSIS | 2472–2699 | 2 | - | - | - | - | DISCOVERED |
| C:e2699:repeat:HIGH:POSITION | CONDITION_ANALYSIS | 2472–2699 | 2 | - | - | - | - | DISCOVERED |
| C:e2471:sum:HIGH:RETURN | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |
| C:e2471:sum:HIGH:POSITION | CONDITION_ANALYSIS | 2244–2471 | 2 | - | - | - | - | DISCOVERED |
| C:e2471:sum:HIGH:TREND+FREQ | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |
| C:e2471:sum:LOW:FREQUENCY | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |
| C:e2471:sum:LOW:POSITION | CONDITION_ANALYSIS | 2244–2471 | 2 | - | - | - | - | DISCOVERED |
| C:e2471:sum:LOW:FREQ+RETURN | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |
| C:e2471:highnum:HIGH:FREQUENCY | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |
| C:e2471:highnum:HIGH:RETURN | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |
| C:e2471:highnum:HIGH:POSITION | CONDITION_ANALYSIS | 2244–2471 | 2 | - | - | - | - | DISCOVERED |
| C:e2471:highnum:HIGH:TREND+FREQ | CONDITION_ANALYSIS | 2244–2471 | 1 | - | - | - | - | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
