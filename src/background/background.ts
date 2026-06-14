// === Moon Eclipse: Background Service Worker ===

import {
    MoonSettings,
    MoonMessage,
    GetSettingsResponse,
} from "../shared/types";
import { getSettings, updateSettings, isExcluded } from "../shared/storage";
import { generateCSS } from "./css-rules";
import { setupSchedule, isInRange } from "./scheduler";

// Cached CSS — regenerated only when colors change
let cachedCSS = "";
let cachedBg = "";
let cachedFg = "";

async function getCSS(settings: MoonSettings): Promise<string> {
    if (
        cachedCSS &&
        cachedBg === settings.backgroundColor &&
        cachedFg === settings.textColor
    ) {
        return cachedCSS;
    }
    cachedBg = settings.backgroundColor;
    cachedFg = settings.textColor;
    cachedCSS = generateCSS(settings);
    return cachedCSS;
}

function invalidateCache(): void {
    cachedCSS = "";
    cachedBg = "";
    cachedFg = "";
}

async function broadcastToTabs(msg: MoonMessage): Promise<void> {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
        if (tab.id != null) {
            try {
                await browser.tabs.sendMessage(tab.id, msg);
            } catch {
                // Tab may not have content script loaded — ignore
            }
        }
    }
}

async function handleGetSettings(
    hostname: string,
): Promise<GetSettingsResponse> {
    const settings = await getSettings();
    const css = await getCSS(settings);
    const excluded = isExcluded(hostname, settings);
    const inSchedule = !settings.scheduleEnabled || isInRange(settings);
    const shouldApply = settings.enabled && !excluded && inSchedule;
    return { settings, shouldApply, css };
}

async function handleUpdateSettings(
    changes: Partial<MoonSettings>,
): Promise<void> {
    const oldSettings = await getSettings();
    const colorChanged =
        (changes.backgroundColor &&
            changes.backgroundColor !== oldSettings.backgroundColor) ||
        (changes.textColor && changes.textColor !== oldSettings.textColor);

    if (colorChanged) {
        invalidateCache();
    }

    await updateSettings(changes);

    const newSettings = { ...oldSettings, ...changes };

    if (
        changes.scheduleEnabled !== undefined ||
        changes.scheduleStart !== undefined ||
        changes.scheduleEnd !== undefined
    ) {
        setupSchedule(newSettings);
    }

    await broadcastToTabs({ type: "reload" });
}

async function handleToggle(): Promise<void> {
    const settings = await getSettings();
    const newEnabled = !settings.enabled;
    await updateSettings({ enabled: newEnabled });

    if (newEnabled) {
        await broadcastToTabs({ type: "enable" });
    } else {
        await broadcastToTabs({ type: "disable" });
    }
}

// --- Message handler ---
browser.runtime.onMessage.addListener(
    (msg: MoonMessage, _sender, sendResponse) => {
        (async () => {
            switch (msg.type) {
                case "getSettings":
                    return handleGetSettings(msg.hostname);
                case "updateSettings":
                    await handleUpdateSettings(msg.changes);
                    return undefined;
                case "toggle":
                    await handleToggle();
                    return undefined;
                default:
                    return undefined;
            }
        })().then(
            (result) => sendResponse(result),
            () => sendResponse(undefined),
        );
        return true;
    },
);

// --- Alarm handler ---
browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "schedule-on") {
        await broadcastToTabs({ type: "enable" });
    } else if (alarm.name === "schedule-off") {
        await broadcastToTabs({ type: "disable" });
    }
    // Re-arm daily
    const settings = await getSettings();
    setupSchedule(settings);
});

// --- Storage change listener ---
browser.storage.onChanged.addListener(async (changes) => {
    if (changes.settings) {
        const oldSettings: MoonSettings | undefined = changes.settings.oldValue;
        const newSettings: MoonSettings | undefined = changes.settings.newValue;
        if (
            oldSettings &&
            newSettings &&
            (oldSettings.backgroundColor !== newSettings.backgroundColor ||
                oldSettings.textColor !== newSettings.textColor)
        ) {
            invalidateCache();
            await broadcastToTabs({ type: "reload" });
        }
    }
});

// --- Startup ---
(async () => {
    const settings = await getSettings();
    await getCSS(settings);
    setupSchedule(settings);
})();
