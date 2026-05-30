import { test } from "node:test";
import assert from "node:assert/strict";
import { formatOverlapReport } from "../src/overlaps/report.ts";
import type { AnalyzeResult, Interval, Overlap, SkippedRecords } from "../src/types.ts";

const toTimestamp = (isoString: string): number => Date.parse(isoString);

const makeInterval = (
  id: number,
  startIso: string,
  minutes: number,
  extra: { project?: string; task?: string } = {},
): Interval => ({
  id,
  start: toTimestamp(startIso),
  end: toTimestamp(startIso) + minutes * 60000,
  minutes,
  project: extra.project ?? "Project",
  task: extra.task ?? "Task",
  description: "",
});

interface MakeResultOptions {
  timeEntryCount?: number;
  intervals?: unknown[];
  overlaps?: Overlap[];
  totalMinutes?: number;
  skipped?: Partial<SkippedRecords>;
}

function makeResult({
  timeEntryCount = 0,
  intervals = [],
  overlaps = [],
  totalMinutes = 0,
  skipped,
}: MakeResultOptions = {}): AnalyzeResult {
  return {
    timeEntryCount,
    intervals: intervals as Interval[],
    overlaps,
    totalMinutes,
    skipped: { deleted: 0, noStartTime: [], zeroDuration: [], ...skipped },
  };
}

test("no overlaps → green message and summary", () => {
  const report = formatOverlapReport(makeResult({ timeEntryCount: 3, intervals: [1, 2, 3], totalMinutes: 150 }));
  assert.match(report, /✅ No overlaps/);
  assert.match(report, /Total records:\s+3/);
  assert.match(report, /Checked:\s+3/);
  assert.match(report, /Total hours:\s+2 h 30 min/);
  assert.doesNotMatch(report, /❌/);
});

test("source is printed only when provided", () => {
  const withSource = formatOverlapReport(makeResult(), { source: "data/x.json" });
  const withoutSource = formatOverlapReport(makeResult());
  assert.match(withSource, /Source:\s+data\/x\.json/);
  assert.doesNotMatch(withoutSource, /Source:/);
});

test("overlap → table, pair count, ids, and names", () => {
  const first = makeInterval(11, "2026-06-01T08:00:00Z", 60, { project: "Alfa", task: "Design" });
  const second = makeInterval(22, "2026-06-01T08:30:00Z", 60, { project: "Beta", task: "Code" });
  const report = formatOverlapReport(
    makeResult({
      timeEntryCount: 2,
      intervals: [first, second],
      overlaps: [{ first, second, overlapMinutes: 30 }],
    }),
  );
  assert.match(report, /❌ Overlapping pairs found: 1/);
  assert.match(report, /Total overlaps: 1/);
  assert.match(report, /\b11\b/);
  assert.match(report, /\b22\b/);
  assert.match(report, /Alfa/);
  assert.match(report, /Beta/);
  assert.match(report, /30 min/);
});

test("skipped records are printed below the report", () => {
  const report = formatOverlapReport(
    makeResult({ timeEntryCount: 5, skipped: { deleted: 1, noStartTime: [7, 8], zeroDuration: [9] } }),
  );
  assert.match(report, /Skipped:\s+deleted 1, no start time 2, zero duration 1/);
  assert.match(report, /No start time .*7, 8/);
  assert.match(report, /Zero\/invalid duration .*9/);
});
