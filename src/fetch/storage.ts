import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TimePayload } from "../types.ts";

export function payloadFileName(startDate: string, endDate: string): string {
  const rangeStamp = startDate === endDate ? startDate : `${startDate}_${endDate}`;
  return `time-${rangeStamp}.json`;
}

export function writePayload(payload: TimePayload): string {
  mkdirSync("data", { recursive: true });
  const { startDate, endDate } = payload.meta;
  const outputPath = join("data", payloadFileName(startDate, endDate));
  writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
}
