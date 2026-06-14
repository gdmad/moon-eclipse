import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { isInRange, getNextTriggerTime } from "../src/background/scheduler";
import type { MoonSettings } from "../src/shared/types";

// Tests run with TZ=UTC (see scripts/test.mjs), so the faked clock hour
// equals the UTC hour.
function at(ms: number): void {
  mock.timers.enable({ apis: ["Date"], now: ms });
}

function settings(start: string, end: string): MoonSettings {
  return {
    enabled: true,
    backgroundColor: "#0d0d12",
    textColor: "#d0d0d8",
    scheduleEnabled: true,
    scheduleStart: start,
    scheduleEnd: end,
    excludeList: [],
  };
}

test("same-day range: midday is inside 08:00-18:00", () => {
  at(Date.UTC(2026, 0, 1, 12, 0));
  assert.equal(isInRange(settings("08:00", "18:00")), true);
  mock.timers.reset();
});

test("same-day range: evening is outside 08:00-18:00", () => {
  at(Date.UTC(2026, 0, 1, 20, 0));
  assert.equal(isInRange(settings("08:00", "18:00")), false);
  mock.timers.reset();
});

test("overnight range: late evening is inside 20:00-06:00", () => {
  at(Date.UTC(2026, 0, 1, 22, 0));
  assert.equal(isInRange(settings("20:00", "06:00")), true);
  mock.timers.reset();
});

test("overnight range: early morning is inside 20:00-06:00", () => {
  at(Date.UTC(2026, 0, 1, 3, 0));
  assert.equal(isInRange(settings("20:00", "06:00")), true);
  mock.timers.reset();
});

test("overnight range: midday is outside 20:00-06:00", () => {
  at(Date.UTC(2026, 0, 1, 12, 0));
  assert.equal(isInRange(settings("20:00", "06:00")), false);
  mock.timers.reset();
});

test("getNextTriggerTime rolls to next day when the time already passed", () => {
  at(Date.UTC(2026, 0, 1, 22, 30));
  assert.equal(getNextTriggerTime("06:00"), Date.UTC(2026, 0, 2, 6, 0));
  mock.timers.reset();
});

test("getNextTriggerTime stays on the same day when the time is ahead", () => {
  at(Date.UTC(2026, 0, 1, 5, 0));
  assert.equal(getNextTriggerTime("06:00"), Date.UTC(2026, 0, 1, 6, 0));
  mock.timers.reset();
});
