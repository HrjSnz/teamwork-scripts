import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeOverlaps } from "../src/overlaps/analyze.ts";
import type { AnalyzeResult, TeamworkTimeEntry } from "../src/types.ts";

let nextId = 1;

interface MakeOptions {
  id?: number;
  timeLogged?: string | null;
  hasStartTime?: boolean;
  deleted?: boolean;
  taskId?: number;
  projectId?: number;
  description?: string;
}

function makeTimeEntry(startTime: string | null, minutes: number, options: MakeOptions = {}): TeamworkTimeEntry {
  return {
    id: options.id ?? nextId++,
    timeLogged: "timeLogged" in options ? options.timeLogged : startTime,
    minutes,
    hasStartTime: options.hasStartTime ?? true,
    deleted: options.deleted ?? false,
    taskId: options.taskId ?? 1,
    projectId: options.projectId ?? 1,
    description: options.description ?? "",
  };
}

function payloadOf(...timeEntries: TeamworkTimeEntry[]) {
  return { meta: {}, timeEntries, included: { tasks: {}, projects: {} } };
}

function pairKeys(result: AnalyzeResult): string[] {
  return result.overlaps
    .map((overlap) => [overlap.first.id, overlap.second.id].sort((left, right) => left - right).join("-"))
    .sort();
}

test("A: separate intervals with no touching → 0", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 15, { id: 1 }), makeTimeEntry("2026-06-01T08:30:00Z", 15, { id: 2 })),
  );
  assert.equal(result.overlaps.length, 0);
});

test("B: touching ends (A ends where B starts) → 0 (allowed)", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 30, { id: 1 }), makeTimeEntry("2026-06-01T08:30:00Z", 30, { id: 2 })),
  );
  assert.equal(result.overlaps.length, 0, "touching at 08:30/08:30 must not be an overlap");
});

test("B2: sub-minute seconds — A ends and B starts within the same minute → 0 (allowed)", () => {
  // A starts 12:42:02 for 7 min → ends 12:49:02; B starts 12:49:00 for 6 min.
  // Raw seconds give a 2-second overlap, but at minute granularity they only touch.
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-29T12:42:02Z", 7, { id: 1 }), makeTimeEntry("2026-06-29T12:49:00Z", 6, { id: 2 })),
  );
  assert.equal(result.overlaps.length, 0, "touching within the same minute must not be an overlap");
});

test("C: partial overlap → 1, correct minutes", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 15, { id: 1 }), makeTimeEntry("2026-06-01T08:10:00Z", 20, { id: 2 })),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
  assert.equal(result.overlaps[0].overlapMinutes, 5);
});

test("D: one fully inside the other → 1", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 60, { id: 1 }), makeTimeEntry("2026-06-01T08:15:00Z", 15, { id: 2 })),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
  assert.equal(result.overlaps[0].overlapMinutes, 15);
});

test("E: identical interval → 1", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 30, { id: 1 }), makeTimeEntry("2026-06-01T08:00:00Z", 30, { id: 2 })),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
  assert.equal(result.overlaps[0].overlapMinutes, 30);
});

test("F: same start, different end → 1", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 60, { id: 1 }), makeTimeEntry("2026-06-01T08:00:00Z", 30, { id: 2 })),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
  assert.equal(result.overlaps[0].overlapMinutes, 30);
});

test("G: same end, different start → 1", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 60, { id: 1 }), makeTimeEntry("2026-06-01T08:30:00Z", 30, { id: 2 })),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
  assert.equal(result.overlaps[0].overlapMinutes, 30);
});

test("H: interval across midnight → 1", () => {
  const result = analyzeOverlaps(
    payloadOf(makeTimeEntry("2026-06-08T23:30:00Z", 60, { id: 1 }), makeTimeEntry("2026-06-09T00:00:00Z", 30, { id: 2 })),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
  assert.equal(result.overlaps[0].overlapMinutes, 30);
});

test("I: one long vs. multiple short → each overlap reported separately", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T08:00:00Z", 180, { id: 1 }),
      makeTimeEntry("2026-06-01T08:30:00Z", 10, { id: 2 }),
      makeTimeEntry("2026-06-01T09:30:00Z", 10, { id: 3 }),
    ),
  );
  assert.deepEqual(pairKeys(result), ["1-2", "1-3"]);
});

test("overlap across different projects is also found", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T08:00:00Z", 60, { id: 1, projectId: 100 }),
      makeTimeEntry("2026-06-01T08:30:00Z", 15, { id: 2, projectId: 200 }),
    ),
  );
  assert.deepEqual(pairKeys(result), ["1-2"]);
});

test("J: zero duration is excluded from detection and recorded", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T07:30:00Z", 60, { id: 1 }),
      makeTimeEntry("2026-06-01T08:00:00Z", 0, { id: 2 }),
    ),
  );
  assert.equal(result.overlaps.length, 0);
  assert.deepEqual(result.skipped.zeroDuration, [2]);
});

test("K: no start time and deleted records are skipped", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T08:00:00Z", 60, { id: 1, hasStartTime: false, timeLogged: null }),
      makeTimeEntry("2026-06-01T08:10:00Z", 30, { id: 2, deleted: true }),
      makeTimeEntry("2026-06-01T08:20:00Z", 30, { id: 3 }),
    ),
  );
  assert.equal(result.overlaps.length, 0);
  assert.deepEqual(result.skipped.noStartTime, [1]);
  assert.equal(result.skipped.deleted, 1);
  assert.equal(result.intervals.length, 1);
});

test("R: total hours includes records without start time, excludes deleted/zero", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T09:00:00Z", 60, { id: 1 }),
      makeTimeEntry("2026-06-01T10:00:00Z", 120, { id: 2, hasStartTime: false, timeLogged: null }),
      makeTimeEntry("2026-06-01T10:00:00Z", 0, { id: 3 }),
      makeTimeEntry("2026-06-01T11:00:00Z", 30, { id: 4, deleted: true }),
    ),
  );
  assert.equal(result.totalMinutes, 180);
});

test("L: unsorted input → overlaps are still found", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T09:30:00Z", 10, { id: 3 }),
      makeTimeEntry("2026-06-01T08:00:00Z", 180, { id: 1 }),
      makeTimeEntry("2026-06-01T08:30:00Z", 10, { id: 2 }),
    ),
  );
  assert.deepEqual(pairKeys(result), ["1-2", "1-3"]);
});

test("M: hasStartTime true but unparseable date → noStartTime", () => {
  const result = analyzeOverlaps(payloadOf(makeTimeEntry("not-a-date", 30, { id: 1 })));
  assert.deepEqual(result.skipped.noStartTime, [1]);
  assert.equal(result.intervals.length, 0);
  assert.equal(result.overlaps.length, 0);
});

test("N: timeLogged = null with hasStartTime true → noStartTime", () => {
  const result = analyzeOverlaps(payloadOf(makeTimeEntry(null, 30, { id: 1, hasStartTime: true, timeLogged: null })));
  assert.deepEqual(result.skipped.noStartTime, [1]);
  assert.equal(result.intervals.length, 0);
});

test("O: negative duration is excluded just like zero", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T07:30:00Z", 60, { id: 1 }),
      makeTimeEntry("2026-06-01T08:00:00Z", -15, { id: 2 }),
    ),
  );
  assert.equal(result.overlaps.length, 0);
  assert.deepEqual(result.skipped.zeroDuration, [2]);
});

test("P: three mutually overlapping intervals → 3 pairs", () => {
  const result = analyzeOverlaps(
    payloadOf(
      makeTimeEntry("2026-06-01T08:00:00Z", 60, { id: 1 }),
      makeTimeEntry("2026-06-01T08:20:00Z", 60, { id: 2 }),
      makeTimeEntry("2026-06-01T08:40:00Z", 60, { id: 3 }),
    ),
  );
  assert.deepEqual(pairKeys(result), ["1-2", "1-3", "2-3"]);
});

test("Q: interval has correct start, end, and minutes", () => {
  const result = analyzeOverlaps(payloadOf(makeTimeEntry("2026-06-01T08:00:00Z", 90, { id: 1 })));
  assert.equal(result.intervals.length, 1);
  const interval = result.intervals[0];
  assert.equal(interval.start, Date.parse("2026-06-01T08:00:00Z"));
  assert.equal(interval.end, Date.parse("2026-06-01T09:30:00Z"));
  assert.equal(interval.minutes, 90);
});

test("missing timeEntries field → clear error", () => {
  assert.throws(() => analyzeOverlaps({ meta: {} }), /timeEntries/);
});

test("empty report → 0 overlaps, no error", () => {
  const result = analyzeOverlaps(payloadOf());
  assert.equal(result.overlaps.length, 0);
  assert.equal(result.timeEntryCount, 0);
});
