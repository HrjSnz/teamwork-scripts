import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, formatRange, renderTable } from "../src/overlaps/format.ts";

const toTimestamp = (isoString: string): number => Date.parse(isoString);

test("formatDate formats in Europe/Prague timezone (YYYY-MM-DD)", () => {
  assert.equal(formatDate(toTimestamp("2026-01-15T22:30:00Z")), "2026-01-15");
});

test("formatDate: late UTC evening falls on the next Prague day", () => {
  assert.equal(formatDate(toTimestamp("2026-01-15T23:30:00Z")), "2026-01-16");
});

test("formatRange within a day → no +1 marker", () => {
  const start = toTimestamp("2026-01-15T08:00:00Z");
  assert.equal(formatRange(start, start + 45 * 60000), "09:00–09:45");
});

test("formatRange across midnight (in Prague) → +1 marker", () => {
  const start = toTimestamp("2026-01-15T22:30:00Z");
  assert.equal(formatRange(start, start + 90 * 60000), "23:30–01:00+1");
});

test("renderTable: header, separator, and rows", () => {
  const table = renderTable(["A", "Bee"], [["x", "y"]], [3, 6]);
  const lines = table.split("\n");
  assert.equal(lines.length, 3, "header + separator + 1 row");
  assert.match(lines[1], /┼/, "separator has column crossing");
  assert.ok(lines[0].startsWith("A"));
});

test("renderTable: long cell is truncated to maxWidth with …", () => {
  const table = renderTable(["A", "B"], [["x", "a very long text"]], [3, 6]);
  assert.match(table, /a ver…/);
  assert.ok(!table.includes("long"), "overflowing text must not appear");
});

test("renderTable: column is as wide as the widest cell/header", () => {
  const table = renderTable(["AB", "X"], [["A", "longer"]], [10, 10]);
  const [headerLine, , rowLine] = table.split("\n");
  assert.equal(headerLine.split(" │ ")[0], "AB");
  assert.equal(rowLine.split(" │ ")[0], "A ");
});
