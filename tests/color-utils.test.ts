import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hexToRgb,
  rgbToHex,
  lighten,
  darken,
} from "../src/background/color-utils";

test("hexToRgb parses 6-digit hex", () => {
  assert.deepEqual(hexToRgb("#0d0d12"), { r: 13, g: 13, b: 18 });
});

test("hexToRgb parses 3-digit shorthand", () => {
  assert.deepEqual(hexToRgb("#f0a"), { r: 255, g: 0, b: 170 });
});

test("rgbToHex pads and clamps out-of-range channels", () => {
  assert.equal(rgbToHex(13, 13, 18), "#0d0d12");
  assert.equal(rgbToHex(-5, 300, 0), "#00ff00");
});

test("lighten: 0% is identity, 100% is white", () => {
  assert.equal(lighten("#123456", 0), "#123456");
  assert.equal(lighten("#123456", 100), "#ffffff");
});

test("darken: 0% is identity, 100% is black", () => {
  assert.equal(darken("#abcdef", 0), "#abcdef");
  assert.equal(darken("#abcdef", 100), "#000000");
});

test("lighten raises channel values, darken lowers them", () => {
  assert.ok(hexToRgb(lighten("#202020", 50)).r > 0x20);
  assert.ok(hexToRgb(darken("#202020", 50)).r < 0x20);
});
