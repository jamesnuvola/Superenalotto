# SONAR — 3+ context analysis

Run: 2026-10-03T15:53:28.368Z
Dataset draws: 2928; analysis horizon: 300–2927; rolling window: 228

## What this analysis asks
For each frozen feature × regime × strategy condition, identify historical ≥3-hit events, then inspect their pre-draw context and nearby trajectory. The same event is deduplicated across overlapping windows. This is hypothesis generation, not validation.

## Summary
Unique ≥3 events across all tested windows/conditions: **148**
Unique ≥3 events in latest 228 draws: **8**

### Conditions with repeated distinct ≥3 events
- repeat:HIGH:POSITION: **11** distinct events
- repeat:HIGH:RETURN: **9** distinct events
- odd:LOW:POSITION: **7** distinct events
- sum:LOW:POSITION: **6** distinct events
- highnum:HIGH:POSITION: **6** distinct events
- odd:HIGH:RETURN: **6** distinct events
- sum:LOW:FREQUENCY: **5** distinct events
- sum:LOW:FREQ+RETURN: **5** distinct events
- repeat:HIGH:FREQUENCY: **5** distinct events
- repeat:HIGH:FREQ+RETURN: **5** distinct events
- sum:HIGH:RETURN: **5** distinct events
- highnum:LOW:POSITION: **5** distinct events
- sum:HIGH:POSITION: **5** distinct events
- highnum:HIGH:RETURN: **5** distinct events
- sum:LOW:RETURN: **4** distinct events
- highnum:LOW:RETURN: **4** distinct events
- odd:HIGH:POSITION: **4** distinct events
- repeat:HIGH:TREND: **4** distinct events
- highnum:LOW:FREQUENCY: **3** distinct events
- highnum:LOW:FREQ+RETURN: **3** distinct events
- sum:HIGH:TREND+FREQ: **3** distinct events
- odd:HIGH:FREQUENCY: **3** distinct events
- odd:HIGH:TREND+FREQ: **3** distinct events
- odd:HIGH:FREQ+RETURN: **3** distinct events
- repeat:HIGH:TREND+FREQ: **3** distinct events
- highnum:LOW:TREND: **3** distinct events
- odd:HIGH:TREND: **3** distinct events
- odd:LOW:RETURN: **3** distinct events
- odd:LOW:FREQUENCY: **2** distinct events
- odd:LOW:FREQ+RETURN: **2** distinct events

## Recent ≥3 events
- draw #2747 20/11/2025 | highnum:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | highnum:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | odd:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | odd:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | repeat:HIGH:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | repeat:HIGH:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | sum:LOW:FREQ+RETURN | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}
- draw #2747 20/11/2025 | sum:LOW:FREQUENCY | hits **3** | ticket [5, 9, 17, 18, 73, 85] | target [5, 9, 15, 17, 48, 74] | context {"sum":271,"highnum":2.761904761904762,"odd":2.9047619047619047,"repeat":0.45}

## Context fingerprints of recent events
### #2747 20/11/2025 — highnum:LOW:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — highnum:LOW:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — odd:LOW:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — odd:LOW:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — repeat:HIGH:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — repeat:HIGH:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — sum:LOW:FREQ+RETURN — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

### #2747 20/11/2025 — sum:LOW:FREQUENCY — 3 hits
Context: sum=LOW, highnum=LOW, odd=LOW, repeat=HIGH
Ticket: 5, 9, 17, 18, 73, 85; target: 5, 9, 15, 17, 48, 74
Previous 5: 11/11/2025:288/3H/4O | 13/11/2025:250/3H/4O | 14/11/2025:298/3H/2O | 15/11/2025:274/3H/4O | 18/11/2025:369/4H/3O

## Methodological interpretation
- Repeated events are more useful than a single 3+ event, but overlapping windows do not create independent evidence.
- A condition is not promoted from this report. Its failures must be compared with nearby cases under the same frozen condition, then tested OOS.
- The key question is branching: which additional context separates success from failure, rather than whether one rule is always valid.