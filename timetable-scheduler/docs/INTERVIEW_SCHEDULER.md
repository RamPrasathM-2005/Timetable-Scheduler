# Timetable Generator - Interview Notes

## Core Constraints Enforced

1. Period 1 is reserved for theory, with high-credit courses prioritized.
2. The same course is not repeated in period 1 on different days.
3. Labs are allocated in this order only: `5-6`, then `7-8`.
4. Theory allocation order after labs: `2,3,4` first, then `7,8`.
5. Staff continuous-theory prevention: if staff teaches period `p`, they are blocked at `p-1` and `p+1`.
6. Integrated course rule: theory and lab for the same course are not placed on the same day.
7. Existing semester entries are preserved (manual allocations are locked and never overwritten).

## Generation Strategy

1. Load current semester timetable rows and lock them into the in-memory grid.
2. Subtract locked slots from pending required hours.
3. Allocate labs with strict block order (`5-6` -> `7-8`) and day spread preference.
4. Allocate period-1 theory with unique-course enforcement.
5. Allocate remaining theory by priority (`2,3,4` -> `7,8`) with staff-break checks.
6. Optional repair (backtracking) and optional exact search mode for difficult cases.
7. Insert only newly generated slots; locked/manual rows remain untouched.

## API Controls

POST `/timetable/generate/:semesterId`

- `mode`: `heuristic | scored | exact`
- `seed`: reproducible random seed
- `backtrackDepth`, `maxBacktrackAttempts`
- `exactMaxNodes`, `exactTimeLimitMs`

## Metrics Returned

- `p1TheorySlotsFilled`, `p1UnfilledDays`
- `filledSlots`, `theorySlotsFilled`, `labSlotsFilled`, `utilizationPct`
- `unallocatedTheoryHours`, `unallocatedLabHours`
- conflict check counters and runtime metrics

Detailed guide: see docs/SCHEDULER_FULL_EXPLANATION.md
