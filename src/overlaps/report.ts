import { formatDate, formatMinutes, formatRange, renderTable } from "./format.ts";
import type { AnalyzeResult, Overlap } from "../types.ts";

const HEADERS = [
  "Date", "A: time", "A id", "Project A", "Task A",
  "B: time", "B id", "Project B", "Task B", "Overlap",
];
const COLUMN_WIDTHS = [10, 14, 10, 20, 24, 14, 10, 20, 24, 8];

const overlapRows = (overlaps: Overlap[]): string[][] =>
  overlaps.map(({ first, second, overlapMinutes }) => [
    formatDate(first.start),
    formatRange(first.start, first.end),
    String(first.id),
    first.project,
    first.task,
    formatRange(second.start, second.end),
    String(second.id),
    second.project,
    second.task,
    `${overlapMinutes} min`,
  ]);

export function formatOverlapReport(
  { timeEntryCount, intervals, totalMinutes, overlaps, skipped }: AnalyzeResult,
  { source }: { source?: string } = {},
): string {
  const lines: string[] = [];

  if (source) lines.push(`Source:          ${source}`);
  lines.push(`Total records:   ${timeEntryCount}`);
  lines.push(`Checked:         ${intervals.length}`);
  lines.push(
    `Skipped:         deleted ${skipped.deleted}, ` +
      `no start time ${skipped.noStartTime.length}, ` +
      `zero duration ${skipped.zeroDuration.length}`,
  );
  lines.push(`Total hours:     ${formatMinutes(totalMinutes)}`);
  lines.push("");

  if (overlaps.length === 0) {
    lines.push("✅ No overlaps — all recorded times are OK.");
  } else {
    lines.push(`❌ Overlapping pairs found: ${overlaps.length}`);
    lines.push("");
    lines.push(renderTable(HEADERS, overlapRows(overlaps), COLUMN_WIDTHS));
    lines.push("");
    lines.push(`Total overlaps: ${overlaps.length}`);
  }

  if (skipped.noStartTime.length) {
    lines.push("");
    lines.push(`⚠️  No start time (cannot verify), id: ${skipped.noStartTime.join(", ")}`);
  }
  if (skipped.zeroDuration.length) {
    lines.push(`⚠️  Zero/invalid duration (excluded from check), id: ${skipped.zeroDuration.join(", ")}`);
  }

  return lines.join("\n");
}
