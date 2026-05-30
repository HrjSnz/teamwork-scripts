import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveHost } from "../src/fetch/config.ts";

test("bare subdomain → appends .teamwork.com", () => {
  assert.equal(resolveHost("mycompany"), "mycompany.teamwork.com");
});

test("full host is left as-is", () => {
  assert.equal(resolveHost("mycompany.teamwork.com"), "mycompany.teamwork.com");
});

test("strips https:// and trailing slash", () => {
  assert.equal(resolveHost("https://mycompany.teamwork.com/"), "mycompany.teamwork.com");
});

test("strips http://", () => {
  assert.equal(resolveHost("http://mycompany.teamwork.com"), "mycompany.teamwork.com");
});

test("multiple trailing slashes are trimmed", () => {
  assert.equal(resolveHost("mycompany.teamwork.com///"), "mycompany.teamwork.com");
});

test("host with dot (custom domain) is not appended to", () => {
  assert.equal(resolveHost("mycompany.eu.teamwork.com"), "mycompany.eu.teamwork.com");
});
