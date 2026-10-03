# SONAR — Autonomous SuperEnalotto Research Engine

Origin/lab: **VinciCasa**  
Target: **SuperEnalotto**  
Run: 2026-10-03T16:00:57.566Z  
DOTs processed: **16**  
DOTs remaining: **60**  
Next DOT: **C:e2015:repeat:HIGH:FREQ+RETURN**

## Architecture

Each DOT is a persistent research agent. It executes once, stores evidence, and is never silently repeated. New draws create a new latest-window frontier while previous evidence remains.

## Parallel tracks

- **Conditional discovery:** find when a rule works and when it fails.
- **6/6 Hunter:** search historical 6/6 conditions directly, independently of 3/4/5-hit paths.
- **Condition analysis:** ≥3 findings spawn child DOTs that compare success contexts with nearby failures.

## Recent DOTs

| DOT | Type | Window | Cases/Successes | ≥3 | ≥4 | ≥5 | 6/6 | Status |
|---|---|---|---:|---:|---:|---:|---:|---|
| C:e2243:highnum:LOW:FREQUENCY | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:highnum:LOW:TREND | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:highnum:LOW:FREQ+RETURN | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:odd:LOW:FREQUENCY | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:odd:LOW:TREND | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:odd:LOW:FREQ+RETURN | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:repeat:HIGH:FREQUENCY | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:repeat:HIGH:TREND | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2243:repeat:HIGH:FREQ+RETURN | CONDITION_ANALYSIS | 2016–2243 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:sum:LOW:FREQUENCY | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:sum:LOW:FREQ+RETURN | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:highnum:LOW:FREQUENCY | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:highnum:LOW:FREQ+RETURN | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:odd:HIGH:FREQUENCY | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:odd:HIGH:FREQ+RETURN | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |
| C:e2015:repeat:HIGH:FREQUENCY | CONDITION_ANALYSIS | 1788–2015 | 1 | - | - | - | - | DISCOVERED |

## Methodological rule

A discovery is not a universal rule. Each rule card records **works when**, **fails when**, success examples and counterexamples. Promotion requires a frozen definition, out-of-sample validation and a conditional null. Failures are evidence, not discarded noise.

## 6/6 priority

The 6/6 Hunter is independent: SONAR does not assume that the path producing 3/4/5 hits is the path to 6/6. Historical 6/6 cases are analysed for their own necessary conditions and alternative routes.
