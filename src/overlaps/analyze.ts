import type {
  AnalyzeResult,
  IncludedRecords,
  Interval,
  NamedRecord,
  Overlap,
  SkippedRecords,
  TeamworkTimeEntry,
} from "../types.ts";

const MILLISECONDS_PER_MINUTE = 60000;

function overlapMinutesBetween(first: Interval, second: Interval): number {
  const overlapStart = Math.max(first.start, second.start);
  const overlapEnd = Math.min(first.end, second.end);
  return Math.round((overlapEnd - overlapStart) / MILLISECONDS_PER_MINUTE);
}

function nameById(recordsById: Record<string, NamedRecord>, id: number | undefined, kind: string): string {
  const record = id == null ? undefined : recordsById[id];
  return record?.name ?? `${kind} ${id ?? "?"}`;
}

/** Validates that the payload contains a `timeEntries` array and returns it along with the `included` block. */
function extractPayload(payload: unknown): { timeEntries: TeamworkTimeEntry[]; included: IncludedRecords } {
  const timeEntries = (payload as { timeEntries?: unknown } | null)?.timeEntries;
  if (!Array.isArray(timeEntries)) {
    throw new Error(
      `Missing "timeEntries" array in data. Expected output from the fetch client: { meta, timeEntries, included }.`,
    );
  }
  const included = (payload as { included?: IncludedRecords }).included ?? {};
  return { timeEntries: timeEntries as TeamworkTimeEntry[], included };
}

/**
 * Sum of worked minutes: from all non-deleted records with positive duration —
 * including those without a start time (they can't be checked for overlaps but count toward hours).
 */
export function sumWorkedMinutes(timeEntries: TeamworkTimeEntry[]): number {
  let total = 0;
  for (const entry of timeEntries) {
    if (entry.deleted === true) continue;
    const minutes = Number(entry.minutes) || 0;
    if (minutes > 0) total += minutes;
  }
  return total;
}

interface IntervalScan {
  intervals: Interval[];
  skipped: SkippedRecords;
}

/**
 * Sorts records into valid intervals and skipped ones (deleted / no start time / zero duration).
 * Resulting intervals are sorted by start time (for the sweep-line overlap detection).
 */
function buildIntervals(timeEntries: TeamworkTimeEntry[], included: IncludedRecords): IntervalScan {
  const tasksById = included.tasks ?? {};
  const projectsById = included.projects ?? {};

  const intervals: Interval[] = [];
  const skipped: SkippedRecords = { deleted: 0, noStartTime: [], zeroDuration: [] };

  for (const entry of timeEntries) {
    if (entry.deleted === true) {
      skipped.deleted += 1;
      continue;
    }
    const minutes = Number(entry.minutes) || 0;

    if (!entry.hasStartTime || !entry.timeLogged) {
      skipped.noStartTime.push(entry.id);
      continue;
    }
    const startTimestamp = Date.parse(entry.timeLogged);
    if (Number.isNaN(startTimestamp)) {
      skipped.noStartTime.push(entry.id);
      continue;
    }
    if (minutes <= 0) {
      skipped.zeroDuration.push(entry.id);
      continue;
    }
    intervals.push({
      id: entry.id,
      start: startTimestamp,
      end: startTimestamp + minutes * MILLISECONDS_PER_MINUTE,
      minutes,
      project: nameById(projectsById, entry.projectId, "project"),
      task: nameById(tasksById, entry.taskId, "task"),
      description: entry.description ?? "",
    });
  }

  intervals.sort((first, second) => first.start - second.start || first.end - second.end);
  return { intervals, skipped };
}

/**
 * Finds all overlapping pairs. Input must be sorted by start time:
 * once the next interval starts after the end of the earlier one, no subsequent
 * interval can conflict either (they start at the same time or later) → break the inner loop.
 */
function findOverlaps(intervals: Interval[]): Overlap[] {
  const overlaps: Overlap[] = [];
  for (let earlierIndex = 0; earlierIndex < intervals.length; earlierIndex++) {
    const earlier = intervals[earlierIndex];
    for (let laterIndex = earlierIndex + 1; laterIndex < intervals.length; laterIndex++) {
      const later = intervals[laterIndex];
      if (later.start >= earlier.end) break; // touching ends are allowed, not an overlap
      overlaps.push({
        first: earlier,
        second: later,
        overlapMinutes: overlapMinutesBetween(earlier, later),
      });
    }
  }
  return overlaps;
}

export function analyzeOverlaps(payload: unknown): AnalyzeResult {
  const { timeEntries, included } = extractPayload(payload);
  const { intervals, skipped } = buildIntervals(timeEntries, included);
  return {
    timeEntryCount: timeEntries.length,
    intervals,
    totalMinutes: sumWorkedMinutes(timeEntries),
    overlaps: findOverlaps(intervals),
    skipped,
  };
}
