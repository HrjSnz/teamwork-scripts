import { test } from "node:test";
import assert from "node:assert/strict";
import { payloadFileName } from "../src/fetch/storage.ts";

test("single day → time-<date>.json", () => {
  assert.equal(payloadFileName("2026-05-30", "2026-05-30"), "time-2026-05-30.json");
});

test("range → time-<from>_<to>.json", () => {
  assert.equal(payloadFileName("2026-05-01", "2026-05-31"), "time-2026-05-01_2026-05-31.json");
});
