# SONAR — 3+ context analysis

Run: 2026-10-03T15:54:21.865Z
Dataset draws: 2928; latest rolling window: 2700–2927 (228 draws)

## What this analysis asks
Within the latest frozen window, identify every ≥3-hit event across the current condition × strategy matrix, then inspect its pre-draw context and trajectory. This avoids mixing overlapping historical windows into pseudo-independent evidence.

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

## Methodological interpretation
- A 3+ event is a starting point, not evidence of a universal rule.
- Repeated conditions matter more than isolated events, but still require comparison with failures and an OOS split.
- The next test should ask which additional context separates successes from failures under the same frozen condition.