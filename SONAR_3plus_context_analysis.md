# SONAR — 3+ context analysis

Run: 2026-10-03T17:47:16.676Z
Dataset draws: 2928; latest rolling window: 2700–2927 (228 draws); recent audit: 60 draws

## What this analysis asks
Identify ≥3-hit parent events across the current condition × strategy matrix, keep condition × strategy observations as child explanations, then compare the historical success context with same-fingerprint failures. This is hypothesis generation, not validation.

## Corrected counting
Unique draw outcomes producing ≥3: **1**
Condition × strategy ≥3 observations: **8**
Distinct condition × strategy keys: **8**
A single draw can generate several child observations; they are never counted as independent successes.

## Parent events
- draw #2747 20/11/2025 | hits **3** | target [5, 9, 15, 17, 48, 74] | context LOW/LOW/LOW/HIGH | child observations **8**

## Child condition × strategy observations
- draw #2747 20/11/2025 | sum:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | sum:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | highnum:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | highnum:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | odd:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | odd:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | repeat:HIGH:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85]
- draw #2747 20/11/2025 | repeat:HIGH:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85]

## Context fingerprints
### #2747 20/11/2025 — 3 hits
Fingerprint: LOW/LOW/LOW/HIGH
Children: sum:LOW:FREQUENCY, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY, highnum:LOW:FREQ+RETURN, odd:LOW:FREQUENCY, odd:LOW:FREQ+RETURN, repeat:HIGH:FREQUENCY, repeat:HIGH:FREQ+RETURN
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

## Exact-fingerprint comparison
Reference fingerprint: **LOW/LOW/LOW/HIGH**; historical occurrences **108**; recent occurrences **33**.

| Strategy | N historical | Mean hits | ≥3 | N recent | Mean recent | ≥3 recent |
|---|---:|---:|---:|---:|---:|---:|
| POSITION | 108 | 0.435 | 0 | 33 | 0.455 | 0 |
| RETURN | 108 | 0.407 | 0 | 33 | 0.364 | 0 |
| FREQUENCY | 108 | 0.380 | 1 | 33 | 0.485 | 0 |
| FREQ+RETURN | 108 | 0.380 | 1 | 33 | 0.485 | 0 |
| TREND | 108 | 0.343 | 0 | 33 | 0.333 | 0 |
| TREND+FREQ | 108 | 0.296 | 0 | 33 | 0.303 | 0 |

## Second-level context audit
### Success draw #2747 20/11/2025
- sum: success=271.000 | same-fingerprint failure mean=257.435 | recent mean=254.166
- highnum: success=2.762 | same-fingerprint failure mean=2.739 | recent mean=2.776
- odd: success=2.905 | same-fingerprint failure mean=2.830 | recent mean=2.815
- repeat: success=0.450 | same-fingerprint failure mean=0.307 | recent mean=0.279
- previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

## Recent audit
- #2898 11/08/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2899 13/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:TREND+FREQ
- #2900 14/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:POSITION, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY
- #2901 17/08/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2902 18/08/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2903 20/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:TREND, sum:LOW:TREND+FREQ, highnum:LOW:TREND, highnum:LOW:TREND+FREQ
- #2904 21/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:TREND, sum:LOW:TREND+FREQ, highnum:LOW:TREND, highnum:LOW:TREND+FREQ
- #2905 22/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2906 25/08/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2907 27/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY
- #2908 28/08/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:FREQ+RETURN
- #2909 29/08/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2910 01/09/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2911 03/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:POSITION, highnum:LOW:POSITION, odd:LOW:POSITION, repeat:HIGH:POSITION
- #2912 04/09/2026 | fp=LOW/LOW/LOW/HIGH | best=2 | sum:LOW:POSITION, highnum:LOW:POSITION, odd:LOW:POSITION, repeat:HIGH:POSITION
- #2913 05/09/2026 | fp=LOW/LOW/LOW/HIGH | best=2 | sum:LOW:FREQUENCY, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY, highnum:LOW:FREQ+RETURN
- #2914 08/09/2026 | fp=LOW/LOW/LOW/HIGH | best=2 | sum:LOW:POSITION, highnum:LOW:POSITION, odd:LOW:POSITION, repeat:HIGH:POSITION
- #2915 10/09/2026 | fp=LOW/LOW/LOW/HIGH | best=2 | sum:LOW:FREQUENCY, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY, highnum:LOW:FREQ+RETURN
- #2916 11/09/2026 | fp=LOW/LOW/HIGH/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:TREND, sum:LOW:POSITION, sum:LOW:TREND+FREQ
- #2917 12/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:RETURN, highnum:LOW:RETURN, odd:LOW:RETURN, repeat:HIGH:RETURN
- #2918 15/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY
- #2919 17/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:RETURN, highnum:LOW:RETURN, odd:LOW:RETURN, repeat:HIGH:RETURN
- #2920 18/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:POSITION, highnum:LOW:POSITION, odd:LOW:POSITION, repeat:HIGH:POSITION
- #2921 19/09/2026 | fp=LOW/LOW/LOW/HIGH | best=2 | sum:LOW:POSITION, highnum:LOW:POSITION, odd:LOW:POSITION, repeat:HIGH:POSITION
- #2922 22/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY, highnum:LOW:FREQ+RETURN
- #2923 24/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:RETURN, sum:LOW:POSITION, highnum:LOW:RETURN, highnum:LOW:POSITION
- #2924 25/09/2026 | fp=LOW/LOW/LOW/HIGH | best=0 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:POSITION
- #2925 26/09/2026 | fp=LOW/LOW/LOW/HIGH | best=2 | sum:LOW:POSITION, highnum:LOW:POSITION, odd:LOW:POSITION, repeat:HIGH:POSITION
- #2926 29/09/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:FREQ+RETURN, highnum:LOW:FREQUENCY, highnum:LOW:FREQ+RETURN
- #2927 01/10/2026 | fp=LOW/LOW/LOW/HIGH | best=1 | sum:LOW:FREQUENCY, sum:LOW:RETURN, sum:LOW:TREND, sum:LOW:TREND+FREQ

## Methodological interpretation
- Parent draw counts are the evidence denominator; child observations are explanatory candidates only.
- The historical fingerprint is not a deployment rule.
- Second-level differences are descriptive until frozen and tested OOS against same-fingerprint failures and a conditional null.
- Failures remain evidence and are not discarded.