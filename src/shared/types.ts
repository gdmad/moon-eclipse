// === Moon Eclipse: Shared Types ===

export interface MoonSettings {
  enabled: boolean;
  backgroundColor: string;
  textColor: string;
  followSystem: boolean;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  excludeList: string[];
}

export const DEFAULTS: MoonSettings = {
  enabled: true,
  backgroundColor: "#0d0d12",
  textColor: "#d0d0d8",
  followSystem: false,
  scheduleEnabled: false,
  scheduleStart: "20:00",
  scheduleEnd: "06:00",
  excludeList: [],
};

// --- Message types ---

export type MoonMessage =
  | { type: "getSettings"; hostname: string; prefersDark: boolean }
  | { type: "updateSettings"; changes: Partial<MoonSettings> }
  | { type: "toggle" }
  | { type: "enable" }
  | { type: "disable" }
  | { type: "reload" };

export interface GetSettingsResponse {
  settings: MoonSettings;
  shouldApply: boolean;
  css: string;
}
