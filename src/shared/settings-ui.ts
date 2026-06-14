// === Moon Eclipse: Shared Settings UI Component ===

import type { MoonSettings, MoonMessage, GetSettingsResponse } from "./types";
import { getSettings } from "./storage";
import { isInRange } from "../background/scheduler";
import { createColorPicker, type ColorPicker } from "./color-picker";

type UIMode = "popup" | "options";

let currentSettings: MoonSettings | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export async function renderSettingsUI(
    container: HTMLElement,
    mode: UIMode,
): Promise<void> {
    currentSettings = await getSettings();

    // Minimal internal CSS for layout that depends on mode
    const style = document.createElement("style");
    style.textContent = getBaseCSS(mode);
    document.head.appendChild(style);

    // Build DOM
    container.innerHTML = buildHTML(mode);

    // Bind events
    bindEvents(container, mode);

    // Initial render
    await refreshUI(container);

    // Show the real version from the manifest (avoids hard-coded drift)
    const versionEl = container.querySelector("#version-text");
    if (versionEl) {
        versionEl.textContent = "v" + browser.runtime.getManifest().version;
    }

    // Pre-fill current domain in exclusions input (popup only)
    if (mode === "popup") {
        try {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            const url = tabs[0]?.url;
            if (!url) return;
            if (!url.startsWith("http://") && !url.startsWith("https://")) return;
            const hostname = new URL(url).hostname;
            if (!hostname) return;
            const input = container.querySelector("#excl-input") as HTMLInputElement;
            if (input) {
                input.value = hostname;
            }
        } catch {
            // Non-parseable URL, skip
        }
    }
}

function getBaseCSS(mode: UIMode): string {
    const panelPad = mode === "popup" ? "14px 16px" : "24px 0";
    return `
    .moon-section { margin-bottom: 16px; }
    .moon-section-title {
      font-size: ${mode === "popup" ? "11px" : "12px"};
      color: var(--text2);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .moon-hidden { display: none !important; }

    .cp-pop { margin-top: 10px; }
    .cp { width: 100%; }
    .cp-sv {
      position: relative; width: 100%; height: 96px;
      border-radius: 6px; cursor: crosshair; touch-action: none;
    }
    .cp-sv-cur {
      position: absolute; width: 12px; height: 12px;
      border: 2px solid #fff; border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.5); pointer-events: none;
    }
    .cp-hue {
      position: relative; width: 100%; height: 14px; margin-top: 10px;
      border-radius: 7px; cursor: pointer; touch-action: none;
      background: linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);
    }
    .cp-hue-cur {
      position: absolute; top: 50%; width: 8px; height: 18px;
      border: 2px solid #fff; border-radius: 3px;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.5); pointer-events: none;
    }
  `;
}

function buildHTML(mode: UIMode): string {
    const colorPickerHTML = mode === "popup"
        ? `
          <div class="color-open-btn" id="color-open-bg" title="Pick a color">
            <span class="color-preview" id="color-preview-bg"></span>
          </div>`
        : '<input type="color" id="color-bg">';

    const colorPickerFgHTML = mode === "popup"
        ? `
          <div class="color-open-btn" id="color-open-fg" title="Pick a color">
            <span class="color-preview" id="color-preview-fg"></span>
          </div>`
        : '<input type="color" id="color-fg">';

    return `
    <div class="header">
      <span class="logo">🌑</span>
      <h1>Moon Eclipse</h1>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="theme">Theme</button>
      <button class="tab-btn" data-tab="schedule">Schedule</button>
      <button class="tab-btn" data-tab="exclusions">Exclusions</button>
    </div>

    <!-- === Theme Tab === -->
    <div class="tab-panel active" data-panel="theme">
      <div class="toggle-row">
        <span class="toggle-label">Dark Theme</span>
        <label class="toggle">
          <input type="checkbox" id="toggle-enabled">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="moon-section">
        <div class="moon-section-title">Colors</div>
        <div class="color-row">
          <div class="color-label">Background Color</div>
          <div class="color-inputs">
            ${colorPickerHTML}
            <input type="text" id="hex-bg" maxlength="7" placeholder="#0d0d12">
          </div>
          ${mode === "popup" ? '<div class="cp-pop moon-hidden" id="cp-pop-bg"></div>' : ""}
        </div>
        <div class="color-row">
          <div class="color-label">Text Color</div>
          <div class="color-inputs">
            ${colorPickerFgHTML}
            <input type="text" id="hex-fg" maxlength="7" placeholder="#d0d0d8">
          </div>
          ${mode === "popup" ? '<div class="cp-pop moon-hidden" id="cp-pop-fg"></div>' : ""}
        </div>
      </div>

      <div class="preview" id="preview-block">
        Moonlight illuminates the path through endless darkness...
      </div>

      <button class="btn btn-full" id="btn-reset">↺ Reset to Defaults</button>
    </div>

    <!-- === Schedule Tab === -->
    <div class="tab-panel" data-panel="schedule">
      <div class="toggle-row">
        <span class="toggle-label">Enable Schedule</span>
        <label class="toggle">
          <input type="checkbox" id="toggle-schedule">
          <span class="toggle-slider"></span>
        </label>
      </div>

      <div class="moon-section" id="schedule-editor">
        <div class="moon-section-title">Time Range</div>
        <div class="time-row">
          <label>Start Time</label>
          <input type="number" id="start-h" min="0" max="23" value="20">
          <span class="time-sep">:</span>
          <input type="number" id="start-m" min="0" max="59" value="0">
        </div>
        <div class="time-row">
          <label>End Time</label>
          <input type="number" id="end-h" min="0" max="23" value="6">
          <span class="time-sep">:</span>
          <input type="number" id="end-m" min="0" max="59" value="0">
        </div>
      </div>

      <div class="status-bar" id="schedule-status">Dark theme is off</div>

      <div class="moon-section" style="margin-top:10px">
        <div class="moon-section-title">24-Hour Timeline</div>
        <div class="timeline" id="timeline"></div>
      </div>
    </div>

    <!-- === Exclusions Tab === -->
    <div class="tab-panel" data-panel="exclusions">
      <div class="exclusion-input-row">
        <input type="text" id="excl-input" placeholder="example.com">
        <button class="btn btn-sm" id="excl-add">Add</button>
      </div>
      <div class="moon-section-title">Excluded Domains</div>
      <ul class="exclusion-list" id="excl-list"></ul>
      <div class="placeholder-text" id="excl-empty">No exclusions added yet</div>
    </div>

    <div class="footer">
      <span id="version-text">v1.0.0</span>
      ${mode === "popup" ? '<a id="open-options">Open Settings</a>' : ""}
    </div>
  `;
}

function bindEvents(container: HTMLElement, mode: UIMode): void {
    // Tab switching
    container.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const tab = (btn as HTMLElement).dataset.tab!;
            switchTab(container, tab);
        });
    });

    // Toggle: Dark Theme
    const toggleEnabled = container.querySelector(
        "#toggle-enabled",
    ) as HTMLInputElement;
    toggleEnabled?.addEventListener("change", () => {
        sendMessage({ type: "toggle" });
    });

    // Toggle: Schedule
    const toggleSchedule = container.querySelector(
        "#toggle-schedule",
    ) as HTMLInputElement;
    toggleSchedule?.addEventListener("change", () => {
        const enabled = toggleSchedule.checked;
        const editor = container.querySelector("#schedule-editor")!;
        if (enabled) {
            editor.classList.remove("moon-hidden");
        } else {
            editor.classList.add("moon-hidden");
        }
        updateScheduleSettings(container);
    });

    // Popup color swatches open an inline custom picker (no native dialog)
    if (mode === "popup") {
        setupPopupPicker(container, "backgroundColor", "color-open-bg", "cp-pop-bg", "hex-bg", "color-preview-bg");
        setupPopupPicker(container, "textColor", "color-open-fg", "cp-pop-fg", "hex-fg", "color-preview-fg");
    }

    // Color inputs
    setupColorInput(container, "color-bg", "hex-bg", "backgroundColor");
    setupColorInput(container, "color-fg", "hex-fg", "textColor");

    // Reset
    container.querySelector("#btn-reset")?.addEventListener("click", () => {
        const defaults = {
            backgroundColor: "#0d0d12",
            textColor: "#d0d0d8",
        };
        applySettings(container, defaults as Partial<MoonSettings>);
    });

    // Schedule time inputs — truncate to 2 chars, clamp to max
    const timeInputs = ["start-h", "start-m", "end-h", "end-m"];
    timeInputs.forEach((id) => {
        const input = container.querySelector(`#${id}`) as HTMLInputElement;
        if (!input) return;
        input.addEventListener("input", () => {
            const max = parseInt(input.max || "23", 10);
            let val = input.value.replace(/\D/g, "").slice(0, 2);
            if (val.length > 0) {
                const num = parseInt(val, 10);
                if (num > max) val = String(max);
            }
            input.value = val;
            updateScheduleSettings(container);
        });
    });

    // Exclusions
    container.querySelector("#excl-add")?.addEventListener("click", () => {
        addExclusion(container);
    });
    container.querySelector("#excl-input")?.addEventListener("keydown", (e) => {
        if ((e as KeyboardEvent).key === "Enter") {
            addExclusion(container);
        }
    });

    // Open options
    container.querySelector("#open-options")?.addEventListener("click", (e) => {
        e.preventDefault();
        openOptions();
    });

    // Listen for storage changes to refresh UI
    browser.storage.onChanged.addListener((changes) => {
        if (changes.settings) {
            currentSettings = changes.settings.newValue as MoonSettings;
            refreshUI(container);
        }
    });
}

// --- Helpers ---

function switchTab(container: HTMLElement, tab: string): void {
    container.querySelectorAll(".tab-btn").forEach((b) => {
        b.classList.toggle("active", (b as HTMLElement).dataset.tab === tab);
    });
    container.querySelectorAll(".tab-panel").forEach((p) => {
        p.classList.toggle("active", (p as HTMLElement).dataset.panel === tab);
    });
}

function setupColorInput(
    container: HTMLElement,
    colorId: string,
    hexId: string,
    key: keyof MoonSettings,
): void {
    const colorEl = container.querySelector(
        `#${colorId}`,
    ) as HTMLInputElement | null;
    const hexEl = container.querySelector(
        `#${hexId}`,
    ) as HTMLInputElement | null;

    // The hex field is always present; the native picker (colorEl) exists only
    // in options mode. Bind the hex field regardless so popup edits work too.
    if (!hexEl) return;

    if (colorEl) {
        colorEl.addEventListener("input", () => {
            hexEl.value = colorEl.value;
            debounceUpdate(container, key, colorEl.value);
        });
    }

    hexEl.addEventListener("input", () => {
        const val = hexEl.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            if (colorEl) colorEl.value = val;
            debounceUpdate(container, key, val);
        }
    });
}

function setupPopupPicker(
    container: HTMLElement,
    key: "backgroundColor" | "textColor",
    openId: string,
    popId: string,
    hexId: string,
    previewId: string,
): void {
    const openBtn = container.querySelector(`#${openId}`) as HTMLElement | null;
    const pop = container.querySelector(`#${popId}`) as HTMLElement | null;
    const hexEl = container.querySelector(`#${hexId}`) as HTMLInputElement | null;
    const preview = container.querySelector(`#${previewId}`) as HTMLElement | null;
    if (!openBtn || !pop || !hexEl) return;

    let picker: ColorPicker | null = null;

    openBtn.addEventListener("click", () => {
        const willOpen = pop.classList.contains("moon-hidden");
        // Collapse any picker that is currently open (only one at a time).
        container
            .querySelectorAll(".cp-pop")
            .forEach((p) => p.classList.add("moon-hidden"));
        if (!willOpen) return;

        const current =
            hexEl.value && /^#[0-9a-fA-F]{6}$/.test(hexEl.value)
                ? hexEl.value
                : currentSettings
                  ? (currentSettings[key] as string)
                  : "#000000";

        if (!picker) {
            picker = createColorPicker(current, (hex) => {
                hexEl.value = hex;
                if (preview) preview.style.backgroundColor = hex;
                debounceUpdate(container, key, hex);
            });
            pop.appendChild(picker.el);
        } else {
            picker.setHex(current);
        }
        pop.classList.remove("moon-hidden");
    });
}

function debounceUpdate(
    container: HTMLElement,
    key: keyof MoonSettings,
    value: string,
): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applySettings(container, { [key]: value });
    }, 200);
}

async function applySettings(
    container: HTMLElement,
    changes: Partial<MoonSettings>,
): Promise<void> {
    await sendMessage({ type: "updateSettings", changes });
}

async function sendMessage(
    msg: MoonMessage,
): Promise<GetSettingsResponse | void> {
    try {
        return await browser.runtime.sendMessage(msg);
    } catch {
        // Background may be inactive
    }
}

// --- Schedule ---

function updateScheduleSettings(container: HTMLElement): void {
    const h1 =
        (container.querySelector("#start-h") as HTMLInputElement)?.value ||
        "20";
    const m1 =
        (container.querySelector("#start-m") as HTMLInputElement)?.value || "0";
    const h2 =
        (container.querySelector("#end-h") as HTMLInputElement)?.value || "6";
    const m2 =
        (container.querySelector("#end-m") as HTMLInputElement)?.value || "0";

    const start = `${h1.padStart(2, "0")}:${m1.padStart(2, "0")}`;
    const end = `${h2.padStart(2, "0")}:${m2.padStart(2, "0")}`;
    const enabled =
        (container.querySelector("#toggle-schedule") as HTMLInputElement)
            ?.checked ?? false;

    // Batch all schedule fields in one debounced update
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        applySettings(container, {
            scheduleStart: start,
            scheduleEnd: end,
            scheduleEnabled: enabled,
        });
    }, 200);
}

// --- Exclusions ---

function addExclusion(container: HTMLElement): void {
    const input = container.querySelector("#excl-input") as HTMLInputElement;
    let raw = input.value.trim();
    if (!raw) return;

    // Normalize: remove protocol, www, path
    raw = raw
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .toLowerCase();

    if (!raw.includes(".")) return; // Must have a dot

    if (!currentSettings) return;
    if (currentSettings.excludeList.includes(raw)) {
        input.value = "";
        return; // No duplicates
    }

    const newList = [...currentSettings.excludeList, raw];
    input.value = "";
    applySettings(container, { excludeList: newList });
}

function removeExclusion(container: HTMLElement, domain: string): void {
    if (!currentSettings) return;
    const newList = currentSettings.excludeList.filter((d) => d !== domain);
    applySettings(container, { excludeList: newList });
}

// --- Refresh UI from currentSettings ---

async function refreshUI(container: HTMLElement): Promise<void> {
    if (!currentSettings) return;
    const s = currentSettings;

    // Theme toggle
    const toggleEnabled = container.querySelector(
        "#toggle-enabled",
    ) as HTMLInputElement;
    if (toggleEnabled) toggleEnabled.checked = s.enabled;

    // Colors
    const colorBg = container.querySelector("#color-bg") as HTMLInputElement;
    const hexBg = container.querySelector("#hex-bg") as HTMLInputElement;
    const colorFg = container.querySelector("#color-fg") as HTMLInputElement;
    const hexFg = container.querySelector("#hex-fg") as HTMLInputElement;
    if (colorBg) colorBg.value = s.backgroundColor;
    if (hexBg) hexBg.value = s.backgroundColor;
    if (colorFg) colorFg.value = s.textColor;
    if (hexFg) hexFg.value = s.textColor;

    // Color preview swatches (popup mode)
    const previewBg = container.querySelector("#color-preview-bg") as HTMLElement;
    const previewFg = container.querySelector("#color-preview-fg") as HTMLElement;
    if (previewBg) previewBg.style.backgroundColor = s.backgroundColor;
    if (previewFg) previewFg.style.backgroundColor = s.textColor;

    // Preview
    const preview = container.querySelector("#preview-block") as HTMLElement;
    if (preview) {
        preview.style.backgroundColor = s.backgroundColor;
        preview.style.color = s.textColor;
    }

    // Schedule
    const toggleSchedule = container.querySelector(
        "#toggle-schedule",
    ) as HTMLInputElement;
    if (toggleSchedule) toggleSchedule.checked = s.scheduleEnabled;

    const editor = container.querySelector("#schedule-editor")!;
    if (editor) {
        if (s.scheduleEnabled) {
            editor.classList.remove("moon-hidden");
        } else {
            editor.classList.add("moon-hidden");
        }
    }

    const [sh, sm] = s.scheduleStart.split(":");
    const [eh, em] = s.scheduleEnd.split(":");
    const startH = container.querySelector("#start-h") as HTMLInputElement;
    const startM = container.querySelector("#start-m") as HTMLInputElement;
    const endH = container.querySelector("#end-h") as HTMLInputElement;
    const endM = container.querySelector("#end-m") as HTMLInputElement;
    if (startH) startH.value = sh;
    if (startM) startM.value = sm;
    if (endH) endH.value = eh;
    if (endM) endM.value = em;

    // Schedule status
    const statusEl = container.querySelector("#schedule-status") as HTMLElement;
    if (statusEl) {
        if (!s.scheduleEnabled) {
            statusEl.textContent = "Schedule is disabled";
            statusEl.classList.remove("active");
        } else if (isInRange(s)) {
            statusEl.textContent = "Dark theme is active";
            statusEl.classList.add("active");
        } else {
            statusEl.textContent = `Turns on at ${s.scheduleStart}`;
            statusEl.classList.remove("active");
        }
    }

    // Timeline
    renderTimeline(container, s);

    // Exclusions
    renderExclusions(container, s);
}

function renderTimeline(container: HTMLElement, s: MoonSettings): void {
    const timeline = container.querySelector("#timeline");
    if (!timeline) return;

    const startMin = timeToMin(s.scheduleStart);
    const endMin = timeToMin(s.scheduleEnd);

    timeline.textContent = "";
    for (let h = 0; h < 24; h++) {
        const hour = document.createElement("div");
        hour.className = "timeline-hour" + (s.scheduleEnabled && isHourInRange(h, startMin, endMin) ? " active" : "");
        hour.title = `${h}:00`;
        timeline.appendChild(hour);
    }
}

function isHourInRange(
    hour: number,
    startMin: number,
    endMin: number,
): boolean {
    const hourMin = hour * 60;
    const hourEndMin = hourMin + 59;
    if (startMin <= endMin) {
        return hourMin >= startMin && hourEndMin <= endMin;
    }
    return hourMin >= startMin || hourEndMin <= endMin;
}

function timeToMin(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

function renderExclusions(container: HTMLElement, s: MoonSettings): void {
    const list = container.querySelector("#excl-list") as HTMLElement;
    const empty = container.querySelector("#excl-empty") as HTMLElement;
    if (!list || !empty) return;

    if (s.excludeList.length === 0) {
        list.textContent = "";
        empty.classList.remove("moon-hidden");
        return;
    }

    empty.classList.add("moon-hidden");
    list.textContent = "";
    for (const domain of s.excludeList) {
        const li = document.createElement("li");

        const span = document.createElement("span");
        span.className = "domain";
        span.textContent = domain;

        const btn = document.createElement("button");
        btn.className = "remove-btn";
        btn.textContent = "\u2715";
        btn.addEventListener("click", () => removeExclusion(container, domain));

        li.appendChild(span);
        li.appendChild(btn);
        list.appendChild(li);
    }
}

function openOptions(): void {
    browser.runtime.openOptionsPage();
}
