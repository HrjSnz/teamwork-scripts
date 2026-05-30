/** Date range in YYYY-MM-DD format. */
export interface DateRange {
  startDate: string;
  endDate: string;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const padTwoDigits = (value: number): string => String(value).padStart(2, "0");

const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${padTwoDigits(date.getMonth() + 1)}-${padTwoDigits(date.getDate())}`;

const monthRange = (now: Date, monthOffset: number): DateRange => {
  const firstDay = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0);
  return { startDate: toIsoDate(firstDay), endDate: toIsoDate(lastDay) };
};

const weekRange = (now: Date, weekOffset: number): DateRange => {
  // getDay() returns Sunday as 0 and Saturday as 6; remap so the week starts on Monday.
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday + weekOffset * 7,
  );
  const sunday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 6,
  );
  return { startDate: toIsoDate(monday), endDate: toIsoDate(sunday) };
};

const DATE_USAGE =
  "Usage (date format YYYY-MM-DD):\n" +
  "  <date>             e.g. 2026-05-30\n" +
  "  <from> <to>        e.g. 2026-05-01 2026-05-31\n" +
  "  --current-month    1st → last day of the current month\n" +
  "  --last-month       1st → last day of the previous month\n" +
  "  --current-week     Monday → Sunday of the current week\n" +
  "  --last-week        Monday → Sunday of the previous week";

export function parseDateArgs(rawArgs: string[], now: Date = new Date()): DateRange {
  const flags = new Set(rawArgs.filter((argument) => argument.startsWith("--")));
  const positionalArgs = rawArgs.filter((argument) => !argument.startsWith("--"));

  let startDate: string | undefined;
  let endDate: string | undefined;
  if (flags.has("--current-month")) {
    ({ startDate, endDate } = monthRange(now, 0));
  } else if (flags.has("--last-month")) {
    ({ startDate, endDate } = monthRange(now, -1));
  } else if (flags.has("--current-week")) {
    ({ startDate, endDate } = weekRange(now, 0));
  } else if (flags.has("--last-week")) {
    ({ startDate, endDate } = weekRange(now, -1));
  } else {
    startDate = positionalArgs[0];
    endDate = positionalArgs[1] ?? startDate;
  }

  if (!startDate || !endDate) throw new Error(DATE_USAGE);
  if (!ISO_DATE_PATTERN.test(startDate) || !ISO_DATE_PATTERN.test(endDate)) {
    throw new Error(`Invalid date format. Expected YYYY-MM-DD.\n${DATE_USAGE}`);
  }
  if (endDate < startDate) {
    throw new Error(`End date (${endDate}) is before start date (${startDate}).`);
  }
  return { startDate, endDate };
}
