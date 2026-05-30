#!/usr/bin/env node
import { resolve } from "node:path";
import { reportOverlaps } from "../src/overlaps/check.ts";
import { fail, readJsonFile, runCli } from "../src/cli.ts";

const inputPath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
if (!inputPath) {
  fail(
    "Usage:\n" +
      "  node bin/check-overlaps.ts <path-to-json>\n" +
      "Example:\n" +
      "  node bin/check-overlaps.ts data/time-2026-05-01_2026-05-31.json",
  );
}

void runCli(() => {
  const absolutePath = resolve(inputPath);
  return reportOverlaps(readJsonFile(absolutePath), absolutePath) ? 1 : 0;
});
