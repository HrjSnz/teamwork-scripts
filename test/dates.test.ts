import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDateArgs } from "../src/fetch/dates.ts";

test("single day → start == end", () => {
  assert.deepEqual(parseDateArgs(["2026-05-30"]), {
    startDate: "2026-05-30",
    endDate: "2026-05-30",
  });
});

test("from–to range", () => {
  assert.deepEqual(parseDateArgs(["2026-05-01", "2026-05-31"]), {
    startDate: "2026-05-01",
    endDate: "2026-05-31",
  });
});

test("same from and to is a valid range", () => {
  assert.deepEqual(parseDateArgs(["2026-05-10", "2026-05-10"]), {
    startDate: "2026-05-10",
    endDate: "2026-05-10",
  });
});

test("--current-month → 1st to last day of month (31-day)", () => {
  const result = parseDateArgs(["--current-month"], new Date(2026, 4, 15));
  assert.deepEqual(result, { startDate: "2026-05-01", endDate: "2026-05-31" });
});

test("--current-month respects February in a non-leap year", () => {
  const result = parseDateArgs(["--current-month"], new Date(2025, 1, 10));
  assert.deepEqual(result, { startDate: "2025-02-01", endDate: "2025-02-28" });
});

test("--current-month respects leap-year February", () => {
  const result = parseDateArgs(["--current-month"], new Date(2024, 1, 10));
  assert.deepEqual(result, { startDate: "2024-02-01", endDate: "2024-02-29" });
});

test("--current-month takes precedence and ignores positional args", () => {
  const result = parseDateArgs(["--current-month", "2026-01-01"], new Date(2026, 4, 15));
  assert.deepEqual(result, { startDate: "2026-05-01", endDate: "2026-05-31" });
});

test("--last-month → 1st to last day of previous month", () => {
  const result = parseDateArgs(["--last-month"], new Date(2026, 4, 15));
  assert.deepEqual(result, { startDate: "2026-04-01", endDate: "2026-04-30" });
});

test("--last-month wraps across year boundary (January → December)", () => {
  const result = parseDateArgs(["--last-month"], new Date(2026, 0, 10));
  assert.deepEqual(result, { startDate: "2025-12-01", endDate: "2025-12-31" });
});

test("--last-month respects February in a non-leap year", () => {
  const result = parseDateArgs(["--last-month"], new Date(2025, 2, 5));
  assert.deepEqual(result, { startDate: "2025-02-01", endDate: "2025-02-28" });
});

test("--last-month respects leap-year February", () => {
  const result = parseDateArgs(["--last-month"], new Date(2024, 2, 5));
  assert.deepEqual(result, { startDate: "2024-02-01", endDate: "2024-02-29" });
});

test("--last-month takes precedence and ignores positional args", () => {
  const result = parseDateArgs(["--last-month", "2026-01-01"], new Date(2026, 4, 15));
  assert.deepEqual(result, { startDate: "2026-04-01", endDate: "2026-04-30" });
});

test("--current-week → Monday to Sunday (mid-week)", () => {
  const result = parseDateArgs(["--current-week"], new Date(2026, 4, 28)); // Thursday
  assert.deepEqual(result, { startDate: "2026-05-25", endDate: "2026-05-31" });
});

test("--current-week on Sunday stays in the same week", () => {
  const result = parseDateArgs(["--current-week"], new Date(2026, 4, 31)); // Sunday
  assert.deepEqual(result, { startDate: "2026-05-25", endDate: "2026-05-31" });
});

test("--current-week on Monday → start == that day", () => {
  const result = parseDateArgs(["--current-week"], new Date(2026, 4, 25)); // Monday
  assert.deepEqual(result, { startDate: "2026-05-25", endDate: "2026-05-31" });
});

test("--last-week → previous Monday to Sunday", () => {
  const result = parseDateArgs(["--last-week"], new Date(2026, 4, 28)); // Thursday
  assert.deepEqual(result, { startDate: "2026-05-18", endDate: "2026-05-24" });
});

test("--current-week wraps across year boundary", () => {
  const result = parseDateArgs(["--current-week"], new Date(2026, 0, 1)); // Thursday Jan 1
  assert.deepEqual(result, { startDate: "2025-12-29", endDate: "2026-01-04" });
});

test("--last-week wraps across year boundary into December", () => {
  const result = parseDateArgs(["--last-week"], new Date(2026, 0, 1)); // Thursday Jan 1
  assert.deepEqual(result, { startDate: "2025-12-22", endDate: "2025-12-28" });
});

test("--current-week takes precedence and ignores positional args", () => {
  const result = parseDateArgs(["--current-week", "2026-01-01"], new Date(2026, 4, 28));
  assert.deepEqual(result, { startDate: "2026-05-25", endDate: "2026-05-31" });
});

test("no arguments → error with usage hint", () => {
  assert.throws(() => parseDateArgs([]), /Usage/);
});

test("bad date format → clear error", () => {
  assert.throws(() => parseDateArgs(["2026-5-1"]), /Invalid date format/);
  assert.throws(() => parseDateArgs(["30.5.2026"]), /Invalid date format/);
});

test("second date in bad format → error", () => {
  assert.throws(() => parseDateArgs(["2026-05-01", "whatever"]), /Invalid date format/);
});

test("end before start → error", () => {
  assert.throws(
    () => parseDateArgs(["2026-05-31", "2026-05-01"]),
    /before start date/,
  );
});
