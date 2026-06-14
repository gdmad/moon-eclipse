import { test } from "node:test";
import assert from "node:assert/strict";
import { isExcluded } from "../src/shared/storage";
import type { MoonSettings } from "../src/shared/types";

const base: MoonSettings = {
  enabled: true,
  backgroundColor: "#0d0d12",
  textColor: "#d0d0d8",
  scheduleEnabled: false,
  scheduleStart: "20:00",
  scheduleEnd: "06:00",
  excludeList: ["example.com", "GitHub.com"],
};

test("exact domain is excluded", () => {
  assert.equal(isExcluded("example.com", base), true);
});

test("subdomain matches its parent entry", () => {
  assert.equal(isExcluded("sub.example.com", base), true);
});

test("www. prefix is ignored on both sides", () => {
  assert.equal(isExcluded("www.example.com", base), true);
});

test("matching is case-insensitive", () => {
  assert.equal(isExcluded("github.com", base), true);
});

test("unlisted domain is not excluded", () => {
  assert.equal(isExcluded("other.com", base), false);
});

test("suffix without a dot boundary does not match (notexample.com)", () => {
  assert.equal(isExcluded("notexample.com", base), false);
});
