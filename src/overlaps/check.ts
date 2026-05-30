import { analyzeOverlaps } from "./analyze.ts";
import { formatOverlapReport } from "./report.ts";

/**
 * Shared core of both "check" commands: analyzes the payload, prints the report,
 * and returns the overlap count. The caller (bin) derives the exit code from
 * the return value (>0 overlaps → 1).
 */
export function reportOverlaps(payload: unknown, source?: string): number {
  const result = analyzeOverlaps(payload);
  console.log(formatOverlapReport(result, { source }));
  return result.overlaps.length;
}
