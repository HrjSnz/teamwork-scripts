#!/usr/bin/env node
import { parseDateArgs } from "../src/fetch/dates.ts";
import { fetchTimePayload } from "../src/fetch/client.ts";
import { writePayload } from "../src/fetch/storage.ts";
import { reportOverlaps } from "../src/overlaps/check.ts";
import { runCli } from "../src/cli.ts";

const rawArgs = process.argv.slice(2);
const noSave = rawArgs.includes("--no-save");

void runCli(async () => {
  const { startDate, endDate } = parseDateArgs(rawArgs);
  const payload = await fetchTimePayload({ startDate, endDate, log: console.log });

  let source: string;
  if (noSave) {
    source = `Teamwork ${startDate} → ${endDate} (not saved)`;
  } else {
    source = writePayload(payload);
    console.log(`Saved to: ${source}`);
  }

  console.log("");
  console.log("──────────────────────────── Overlap check ────────────────────────────");
  return reportOverlaps(payload, source) ? 1 : 0;
});
