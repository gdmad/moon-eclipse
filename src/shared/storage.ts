// === Moon Eclipse: Storage Wrapper ===

import { MoonSettings, DEFAULTS } from "./types";

export async function getSettings(): Promise<MoonSettings> {
  try {
    const result = await browser.storage.local.get("settings");
    if (result.settings) {
      // Merge with defaults to fill any missing keys
      return { ...DEFAULTS, ...result.settings };
    }
    return { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function updateSettings(
  partial: Partial<MoonSettings>
): Promise<void> {
  try {
    const current = await getSettings();
    const merged: MoonSettings = { ...current, ...partial };
    await browser.storage.local.set({ settings: merged });
  } catch {
    // Silently fail — caller handles
  }
}

export function isExcluded(
  hostname: string,
  settings: MoonSettings
): boolean {
  const normalized = hostname.replace(/^www\./, "").toLowerCase();
  return settings.excludeList.some((domain) => {
    const d = domain.replace(/^www\./, "").toLowerCase();
    return normalized === d || normalized.endsWith("." + d);
  });
}
