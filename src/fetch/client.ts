import { resolveConfig } from "./config.ts";
import type { TeamworkConfig } from "./config.ts";
import type {
  IncludedRecords,
  Logger,
  TeamworkTimeEntry,
  TimePayload,
} from "../types.ts";

const PAGE_SIZE = 500;

interface Person {
  id?: number | string;
  "first-name"?: string;
  "last-name"?: string;
  "email-address"?: string;
}

interface MeResponse {
  person?: Person;
}

interface TimeResponse {
  timelogs?: TeamworkTimeEntry[];
  included?: IncludedRecords;
}

type RequestParams = Record<string, string | number | undefined | null>;

function mergeIncluded(merged: IncludedRecords, pageIncluded: IncludedRecords | undefined): void {
  if (!pageIncluded) return;
  for (const [type, recordsById] of Object.entries(pageIncluded)) {
    merged[type] = Object.assign(merged[type] ?? {}, recordsById);
  }
}

async function teamworkRequest<T>(
  { baseUrl, authorizationHeader }: TeamworkConfig,
  path: string,
  params: RequestParams = {},
): Promise<T> {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: { Authorization: authorizationHeader, Accept: "application/json" },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let hint = "";
    if (response.status === 401) hint = " → check TEAMWORK_API_KEY";
    else if (response.status === 404) hint = " → check TEAMWORK_DOMAIN";
    throw new Error(
      `HTTP ${response.status} ${response.statusText} at ${url.pathname}${hint}\n${body.slice(0, 500)}`,
    );
  }
  return await response.json() as T;
}

function userDisplayName(person: Person | undefined, fallbackId: number | string): string {
  const fullName = [person?.["first-name"], person?.["last-name"]].filter(Boolean).join(" ");
  return fullName || person?.["email-address"] || String(fallbackId);
}

async function fetchCurrentUser(
  config: TeamworkConfig,
  log: Logger,
): Promise<{ userId: number; userName: string }> {
  const currentUser = await teamworkRequest<MeResponse>(config, "/me.json");
  const userId = Number(currentUser?.person?.id);
  if (!userId) {
    throw new Error("Failed to determine my userId from /me.json.");
  }
  const userName = userDisplayName(currentUser?.person, userId);
  log(`Logged in as: ${userName} (userId=${userId})`);
  return { userId, userName };
}

async function fetchAllTimeEntries(
  config: TeamworkConfig,
  { startDate, endDate, userId, log }: { startDate: string; endDate: string; userId: number; log: Logger },
): Promise<{ timeEntries: TeamworkTimeEntry[]; included: IncludedRecords }> {
  const timeEntries: TeamworkTimeEntry[] = [];
  const included: IncludedRecords = {};
  for (let page = 1; ; page += 1) {
    const pageData = await teamworkRequest<TimeResponse>(config, "/projects/api/v3/time.json", {
      startDate,
      endDate,
      page,
      pageSize: PAGE_SIZE,
      assignedToUserIds: userId,
      include: "projects,tasks,users",
      orderBy: "date",
      orderMode: "asc",
    });
    const pageEntries = pageData.timelogs ?? [];
    timeEntries.push(...pageEntries);
    mergeIncluded(included, pageData.included);
    log(`  page ${page}: ${pageEntries.length} records`);
    if (pageEntries.length < PAGE_SIZE) break;
  }
  return { timeEntries, included };
}

export async function fetchTimePayload(
  { startDate, endDate, log = () => {} }: { startDate: string; endDate: string; log?: Logger },
): Promise<TimePayload> {
  const config = resolveConfig();
  log(`Teamwork: ${config.baseUrl}`);

  const { userId, userName } = await fetchCurrentUser(config, log);

  const startDateTime = `${startDate} 00:00:00`;
  const endDateTime = `${endDate} 23:59:59`;
  log(`Fetching time entries ${startDateTime} → ${endDateTime} …`);

  const { timeEntries, included } = await fetchAllTimeEntries(config, { startDate, endDate, userId, log });

  const myTimeEntries = timeEntries.filter((entry) => Number(entry.userId) === userId);

  return {
    meta: {
      domain: config.host,
      userId,
      userName,
      startDate,
      endDate,
      startDateTime,
      endDateTime,
      count: myTimeEntries.length,
      fetchedAt: new Date().toISOString(),
    },
    timeEntries: myTimeEntries,
    included,
  };
}
