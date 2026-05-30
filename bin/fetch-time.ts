#!/usr/bin/env node
import { parseDateArgs } from "../src/fetch/dates.ts";
import { fetchTimePayload } from "../src/fetch/client.ts";
import { writePayload } from "../src/fetch/storage.ts";
import { formatMinutes } from "../src/overlaps/format.ts";
import { sumWorkedMinutes } from "../src/overlaps/analyze.ts";
import { runCli } from "../src/cli.ts";

void runCli(async () => {
  const { startDate, endDate } = parseDateArgs(process.argv.slice(2));
  const payload = await fetchTimePayload({ startDate, endDate, log: console.log });
  const outputPath = writePayload(payload);

  const totalMinutes = sumWorkedMinutes(payload.timeEntries);
  console.log("");
  console.log(`Done. My records: ${payload.timeEntries.length}`);
  console.log(`Total logged:    ${totalMinutes} min (${formatMinutes(totalMinutes)})`);
  console.log(`Saved to:        ${outputPath}`);
});
