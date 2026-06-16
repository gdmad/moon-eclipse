// === Moon Eclipse: Scheduler ===

import { MoonSettings } from "../shared/types";

export interface ApplyContext {
  excluded: boolean; // hostname is on the exclusion list
  prefersDark: boolean; // OS reports a dark color scheme
  inSchedule: boolean; // current time is inside the schedule range
}

/**
 * Decide whether the dark theme should be applied right now. Pure function so
 * the gating logic is unit-testable. Precedence: master toggle and exclusions
 * win first, then "follow system", then schedule, else always on.
 */
export function resolveShouldApply(
  settings: MoonSettings,
  ctx: ApplyContext,
): boolean {
  if (!settings.enabled || ctx.excluded) return false;
  if (settings.followSystem) return ctx.prefersDark;
  if (settings.scheduleEnabled) return ctx.inSchedule;
  return true;
}

/**
 * Parse "HH:MM" into a Date for the next occurrence of that time.
 */
export function getNextTriggerTime(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

/**
 * Check if current time falls within [start, end], handling overnight ranges.
 */
export function isInRange(settings: MoonSettings): boolean {
  const startMin = timeToMinutes(settings.scheduleStart);
  const endMin = timeToMinutes(settings.scheduleEnd);
  const nowMin = timeToMinutes(
    `${new Date().getHours().toString().padStart(2, "0")}:${new Date()
      .getMinutes()
      .toString()
      .padStart(2, "0")}`
  );

  if (startMin <= endMin) {
    // Same-day range, e.g. 08:00–18:00
    return nowMin >= startMin && nowMin <= endMin;
  }
  // Overnight range, e.g. 20:00–06:00
  return nowMin >= startMin || nowMin <= endMin;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function setupSchedule(settings: MoonSettings): void {
  if (!settings.scheduleEnabled) {
    clearSchedule();
    return;
  }
  browser.alarms.create("schedule-on", {
    when: getNextTriggerTime(settings.scheduleStart),
  });
  browser.alarms.create("schedule-off", {
    when: getNextTriggerTime(settings.scheduleEnd),
  });
}

export function clearSchedule(): void {
  browser.alarms.clear("schedule-on");
  browser.alarms.clear("schedule-off");
}
