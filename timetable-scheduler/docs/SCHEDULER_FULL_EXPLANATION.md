# Timetable Scheduler - Full Explanation (Simple English)

This document explains exactly what is implemented in `backend/controllers/timetableController.js` for `autoGenerateTimetable`.

## 1) What this feature does

When you click **Auto Generate**:

1. It reads all courses, sections, labs, and staff mappings.
2. It loads your already saved timetable rows for this semester.
3. It keeps those existing rows as **locked/manual** entries.
4. It fills only the remaining empty slots based on your constraints.
5. It returns generated timetable + metrics.

Important: Auto generation does **not** delete manual entries now.

---

## 2) Main constraints (hard rules)

These rules are enforced as hard constraints:

1. **Period 1 must be theory** and high-credit courses get priority.
2. **Same course cannot repeat in period 1** on multiple days.
3. **Lab allocation order is strict**: try `5-6`, if not possible try `7-8`.
4. **After labs, theory preference is strict**: `2,3,4` first, then `7,8`.
5. **Staff break rule** for theory: if staff handles period `p`, avoid `p-1` and `p+1`.
6. For **integrated courses** (both theory + lab hours), theory and lab are not placed on same day.
7. Existing semester rows are locked and preserved.

---

## 3) What was added in phases

## Phase 1: Seeded randomness

### What was added

- `normalizeSeed(seedInput)`
- `createSeededRandom(seedInput)`
- `shuffle(array, rng)` (uses seeded RNG)

### Why

To make output reproducible.

### Example

If you call with:

```json
{
  "mode": "heuristic",
  "seed": "demo-2026"
}
```

You will get the same random order behavior each time for the same input data.

---

## Phase 2: Scoring + backtracking repair

### What was added

- `scoreTheoryCandidate(...)`
- `findBestTheorySlot(...)`
- `runBacktrackingRepair()`

### Why

Greedy scheduling can get stuck. Scoring picks better slots. Backtracking undoes a few recent decisions and retries.

### Simple scoring idea

A candidate slot gets score using:

- higher course credits -> higher score
- more pending theory hours -> higher score
- repeated same period pattern -> penalty
- integrated course on lab day -> strong penalty

### Backtracking example

Suppose course `CSE301` needs 2 more theory hours but no direct slot is found.

1. Roll back last `backtrackDepth` theory allocations.
2. Retry slot search for `CSE301`.
3. If found, place it and continue.

---

## Phase 3: Exact solver mode (bounded CSP search)

### What was added

- `runExactTheorySolver()`

### Why

For hard cases, try deeper systematic search before fallback.

### How it works

1. Build valid candidates for each pending course.
2. Choose most constrained course first (fewest candidates).
3. Place candidate and recurse.
4. If dead-end, backtrack.
5. Stop if node/time limit reached.

If limits are hit or no full solution exists, fallback to heuristic+repair.

---

## 4) Manual allocation preservation (very important)

This is now implemented.

### What happens internally

1. Existing active rows for same semester are fetched.
2. They are inserted into in-memory timetable as `locked: true`.
3. Pending hours are reduced based on those locked rows.
4. Scheduler fills only empty slots.
5. Only newly generated rows are inserted.

### Example

You manually place:
- MON P1 -> `MA201`
- TUE P5,P6 -> `CSL201` lab

Then click Auto Generate.

Result:
- These manual slots remain unchanged.
- Auto generation fills around them.

---

## 5) Key function flow (step-by-step)

## Step A: Load data

- Semester + department
- Courses with `mainStaffId`
- Sections
- Lab rooms
- Global busy state (staff/labs from other semesters)

## Step B: Build local state

- `timetable[day][period]`
- `pendingTheory[courseId]`
- `pendingLab[courseId]`
- `dailyCourseCounts`
- `labDays`
- `coursePeriodUsage`

## Step C: Lock existing rows

- read existing semester rows
- place into timetable grid
- mark as locked
- subtract pending hours

## Step D: Allocate labs

- for each lab course, try strict blocks `[5,6]` then `[7,8]`
- validate staff, room, and slot availability
- prefer non-adjacent days when possible

## Step E: Allocate period-1 theory

- iterate days
- choose highest-credit theory course not already used in P1
- enforce staff break + integrated rule

## Step F: Allocate remaining theory

- first from `2,3,4`
- then from `7,8`
- enforce conflicts and constraints

## Step G: Repair / exact mode

- `scored`: run backtracking repair
- `exact`: run exact solver first, then fallback if needed

## Step H: Save + response

- insert generated rows only
- return timetable + metrics + warnings

---

## 6) API usage examples

Endpoint:

`POST /timetable/generate/:semesterId`

## Heuristic (baseline)

```json
{
  "mode": "heuristic",
  "seed": "demo-2026"
}
```

## Scored (recommended for better fill)

```json
{
  "mode": "scored",
  "seed": "demo-2026",
  "backtrackDepth": 4,
  "maxBacktrackAttempts": 40
}
```

## Exact (hard cases)

```json
{
  "mode": "exact",
  "seed": "demo-2026",
  "exactMaxNodes": 50000,
  "exactTimeLimitMs": 12000
}
```

---

## 7) Sample response (trimmed)

```json
{
  "status": "success",
  "message": "Generated with warnings",
  "report": [
    "Warning: CS305 missing 1 theory hours"
  ],
  "metrics": {
    "modeRequested": "scored",
    "modeExecuted": "scored",
    "seedUsed": "demo-2026",
    "filledSlots": 34,
    "theorySlotsFilled": 24,
    "labSlotsFilled": 10,
    "p1TheorySlotsFilled": 5,
    "p1UnfilledDays": 0,
    "utilizationPct": 85,
    "unallocatedTheoryHours": 1,
    "unallocatedLabHours": 0,
    "generationMs": 182
  },
  "data": {
    "MON": {
      "1": { "courseId": "MA201", "courseCode": "MA201", "type": "THEORY" },
      "5": { "courseId": "CSL201", "courseCode": "CSL201", "type": "LAB" }
    }
  }
}
```

---

## 8) Code snippets (important parts)

## Seeded shuffle

```js
const { rng, seedUsed } = createSeededRandom(seedInput);
const shuffled = shuffle(days, rng);
```

## Preserve manual rows

```js
const [existingSemesterRows] = await connection.execute(
  `SELECT dayOfWeek, periodNumber, courseId, sectionId, labId
   FROM Timetable
   WHERE semesterId = ? AND isActive = 'YES'`,
  [semesterId]
);

// put into timetable as locked
```

## Period 1 unique high-credit theory

```js
const p1Candidates = courses
  .filter((c) => pendingTheory[c.courseId] > 0)
  .sort((a, b) => (b.credits - a.credits) || (pendingTheory[b.courseId] - pendingTheory[a.courseId]));

if (p1UsedCourses.has(course.courseId)) continue;
```

## Strict lab block order

```js
const strictLabBlocks = [
  [5, 6],
  [7, 8],
];
```

## Staff break rule

```js
const isStaffFatigued = (staffId, day, p) => {
  return check(p - 1) || check(p + 1);
};
```

---

## 9) What to say in interview (simple)

"I built a constraint-based timetable engine with three modes: heuristic, scored+backtracking, and bounded exact search."

"I enforce hard rules first: period-1 high-credit theory, strict lab blocks, staff break constraints, integrated course day separation, and manual lock preservation."

"I return metrics so quality is measurable, and I support seeded reproducibility for debugging and demos."

---

## 10) Limits you can mention honestly

1. Exact mode is bounded by time/node limits, so very large inputs may fallback.
2. If constraints are too strict, some hours can remain unallocated (reported in warnings/metrics).
3. Current exact mode is optimized for practical runtime, not full mathematical optimality proof.
