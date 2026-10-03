# SONAR — 3+ context analysis

Run: 2026-10-03T15:59:20.756Z
Dataset draws: 2928; latest rolling window: 2700–2927 (228 draws); recent audit: 60 draws

## What this analysis asks
Within the latest frozen window, identify every ≥3-hit event across the current condition × strategy matrix, then compare the recent regime with the historical 3+ fingerprint. This is hypothesis generation, not validation.

## Summary
Unique draw/condition ≥3 events in the latest window: **8**
Distinct conditions producing ≥3: **8**

### Conditions producing ≥3
- highnum:LOW:FREQ+RETURN: **1** events
- highnum:LOW:FREQUENCY: **1** events
- odd:LOW:FREQ+RETURN: **1** events
- odd:LOW:FREQUENCY: **1** events
- repeat:HIGH:FREQ+RETURN: **1** events
- repeat:HIGH:FREQUENCY: **1** events
- sum:LOW:FREQ+RETURN: **1** events
- sum:LOW:FREQUENCY: **1** events

## Event list
- draw #2747 20/11/2025 | sum:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | sum:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | highnum:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | highnum:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | odd:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | odd:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | repeat:HIGH:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | repeat:HIGH:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}

## Context fingerprints
### #2747 20/11/2025 — sum:LOW:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — sum:LOW:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — highnum:LOW:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — highnum:LOW:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — odd:LOW:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — odd:LOW:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — repeat:HIGH:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — repeat:HIGH:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

## Recent regime comparison
Reference fingerprint from the historical 3+ event: **LOW/LOW/LOW/HIGH** (the 20/11/2025 event #2747).
Occurrences of this exact fingerprint in the latest rolling window: **108**; occurrences in the latest 60 draws: **33**.
Recent matching draws: #2894 04/08/2026 (best=0) | #2895 06/08/2026 (best=2) | #2896 07/08/2026 (best=1) | #2897 08/08/2026 (best=1) | #2898 11/08/2026 (best=0) | #2899 13/08/2026 (best=1) | #2900 14/08/2026 (best=1) | #2901 17/08/2026 (best=0) | #2902 18/08/2026 (best=0) | #2903 20/08/2026 (best=1) | #2904 21/08/2026 (best=1) | #2905 22/08/2026 (best=1) | #2906 25/08/2026 (best=0) | #2907 27/08/2026 (best=1) | #2908 28/08/2026 (best=1) | #2909 29/08/2026 (best=0) | #2910 01/09/2026 (best=0) | #2911 03/09/2026 (best=1) | #2912 04/09/2026 (best=2) | #2913 05/09/2026 (best=2) | #2914 08/09/2026 (best=2) | #2915 10/09/2026 (best=2) | #2917 12/09/2026 (best=1) | #2918 15/09/2026 (best=1) | #2919 17/09/2026 (best=1) | #2920 18/09/2026 (best=1) | #2921 19/09/2026 (best=2) | #2922 22/09/2026 (best=1) | #2923 24/09/2026 (best=1) | #2924 25/09/2026 (best=0) | #2925 26/09/2026 (best=2) | #2926 29/09/2026 (best=1) | #2927 01/10/2026 (best=1)

### Strategy performance inside the exact fingerprint
| Strategy | N historical | Mean hits | ≥3 | N recent | Mean recent | ≥3 recent |
|---|---:|---:|---:|---:|---:|---:|
| POSITION | 108 | 0.435 | 0 | 33 | 0.455 | 0 |
| RETURN | 108 | 0.407 | 0 | 33 | 0.364 | 0 |
| FREQUENCY | 108 | 0.380 | 1 | 33 | 0.485 | 0 |
| FREQ+RETURN | 108 | 0.380 | 1 | 33 | 0.485 | 0 |
| TREND | 108 | 0.343 | 0 | 33 | 0.333 | 0 |
| TREND+FREQ | 108 | 0.296 | 0 | 33 | 0.303 | 0 |

### Last recent draws: maximum hit obtainable inside the frozen condition matrix
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
- The historical 3+ fingerprint is used as a comparator, not as a rule to deploy.
- Matching the same fingerprint in recent draws is useful only if the hit distribution and failure cases are also examined.
- A recent absence of ≥3 does not invalidate a historical condition; a recent presence does not confirm it.
- The next branch should compare exact-fingerprint successes against exact-fingerprint failures and then test the separating feature OOS.