// Shared data types across modules (time entry fetching and overlap checking).

/** Callback for progress logging (configurable, defaults to no-op). */
export type Logger = (message: string) => void;

/** A single time entry as returned by the Teamwork API (extra fields are tolerated). */
export interface TeamworkTimeEntry {
  id: number;
  userId?: number | string;
  timeLogged?: string | null;
  minutes?: number | string;
  hasStartTime?: boolean;
  deleted?: boolean;
  taskId?: number;
  projectId?: number;
  description?: string;
  [key: string]: unknown;
}

/** A named associated record (project, task, user) from the `included` block. */
export interface NamedRecord {
  name?: string;
  [key: string]: unknown;
}

/** The `included` block from Teamwork: record type → id map → record. */
export interface IncludedRecords {
  tasks?: Record<string, NamedRecord>;
  projects?: Record<string, NamedRecord>;
  users?: Record<string, NamedRecord>;
  [type: string]: Record<string, NamedRecord> | undefined;
}

/** Metadata stored alongside the time report. */
export interface PayloadMeta {
  domain: string;
  userId: number;
  userName: string;
  startDate: string;
  endDate: string;
  startDateTime: string;
  endDateTime: string;
  count: number;
  fetchedAt: string;
}

/** Complete time report: metadata, time entries, and associated entities. */
export interface TimePayload {
  meta: PayloadMeta;
  timeEntries: TeamworkTimeEntry[];
  included: IncludedRecords;
}

/** A single evaluated interval (time log with parsed start and end). */
export interface Interval {
  id: number;
  start: number;
  end: number;
  minutes: number;
  project: string;
  task: string;
  description: string;
}

/** A detected overlap between two intervals. */
export interface Overlap {
  first: Interval;
  second: Interval;
  overlapMinutes: number;
}

/** Records excluded from the check and the reasons. */
export interface SkippedRecords {
  deleted: number;
  noStartTime: number[];
  zeroDuration: number[];
}

/** Result of the overlap analysis. */
export interface AnalyzeResult {
  timeEntryCount: number;
  intervals: Interval[];
  totalMinutes: number;
  overlaps: Overlap[];
  skipped: SkippedRecords;
}
