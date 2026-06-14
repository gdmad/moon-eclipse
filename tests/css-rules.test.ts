import { test } from "node:test";
import assert from "node:assert/strict";
import { generateCSS } from "../src/background/css-rules";
import type { MoonSettings } from "../src/shared/types";

const s: MoonSettings = {
  enabled: true,
  backgroundColor: "#0d0d12",
  textColor: "#d0d0d8",
  scheduleEnabled: false,
  scheduleStart: "20:00",
  scheduleEnd: "06:00",
  excludeList: [],
};

test("includes the chosen colors marked !important", () => {
  const css = generateCSS(s);
  assert.match(css, /#0d0d12!important/);
  assert.match(css, /#d0d0d8!important/);
});

test("every rule is balanced (braces match)", () => {
  const css = generateCSS(s);
  const open = (css.match(/{/g) || []).length;
  const close = (css.match(/}/g) || []).length;
  assert.equal(open, close);
});

test("is a pure function (same input -> identical output)", () => {
  assert.equal(generateCSS(s), generateCSS({ ...s }));
});

test("resource budget: generated CSS stays small (<4KB)", () => {
  const css = generateCSS(s);
  assert.ok(css.length < 4096, `CSS too large: ${css.length} bytes`);
});

test("rule count stays within expected bounds", () => {
  const css = generateCSS(s);
  const rules = (css.match(/}/g) || []).length;
  assert.ok(rules >= 10 && rules <= 20, `unexpected rule count: ${rules}`);
});

test("rejects an unsafe color value and falls back to a default", () => {
  const malicious = generateCSS({
    ...s,
    backgroundColor: "red;}html{display:none",
  });
  // The injected break-out string must never reach the output.
  assert.doesNotMatch(malicious, /display:none/);
  assert.match(malicious, /#0d0d12!important/);
});
