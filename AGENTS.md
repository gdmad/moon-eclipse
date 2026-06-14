# Moon Eclipse — AGENTS.md

Firefox extension (Manifest V2) that applies a dark theme to any website via CSS rule injection.

## Stack
- **TypeScript**, bundler **esbuild**, no frameworks
- Storage: `browser.storage.local` (single `"settings"` key)
- Scheduler: `browser.alarms` (two alarms: `"schedule-on"`, `"schedule-off"`)
- Permissions: `storage`, `alarms`, `<all_urls>`
- Firefox-only (gecko id: `mooneclipse@example.com`)

## Structure

```
src/
├── background/
│   ├── background.ts       # Service Worker: message handling, CSS cache, alarms, storage listener
│   ├── css-rules.ts        # CSS string generator from settings (pure function)
│   ├── color-utils.ts      # lighten/darken/hexToRgb/rgbToHex
│   └── scheduler.ts        # setupSchedule, isInRange, getNextTriggerTime, overnight ranges
├── content/
│   └── content.ts          # Content Script: injectCSS/removeCSS on command, runs at document_start
├── popup/
│   ├── popup.html          # 350×500px (min-height: 400, max-height: 500)
│   ├── popup.ts            # entry point → renderSettingsUI("popup")
│   └── popup.css           # compact layout
├── options/
│   ├── options.html        # fullscreen (max-width: 640px centered)
│   ├── options.ts          # entry point → renderSettingsUI("options")
│   └── options.css         # spacious layout
└── shared/
    ├── types.ts            # MoonSettings, DEFAULTS, MoonMessage, GetSettingsResponse
    ├── storage.ts          # getSettings, updateSettings, isExcluded
    ├── theme.ts            # lunar palette (10 CSS variable constants)
    └── settings-ui.ts      # shared UI: 3 tabs, toggle, color pickers, schedule, exclusions
```

## Default Settings

```typescript
const DEFAULTS: MoonSettings = {
  enabled: true,
  backgroundColor: "#0d0d12",
  textColor: "#d0d0d8",
  scheduleEnabled: false,
  scheduleStart: "20:00",
  scheduleEnd: "06:00",     // overnight range by default
  excludeList: [],
};
```

Settings are merged with defaults on read (`getSettings`) to fill any missing keys from older versions.

## Build

```bash
npm run build    # one-time build → release/dist/
npm run watch    # watch mode
```

esbuild bundles 4 entry points into IIFE bundles (`format: "iife"`, target `es2020`, minified):
`background.js`, `content.js`, `popup.js`, `options.js`.

## Installation in Firefox

`about:debugging` → "Load Temporary Add-on" → select `release/manifest.json`.  
Ready-to-install folder — `release/`.

## Communication Model

Full message type union (`MoonMessage`):
```typescript
type MoonMessage =
  | { type: "getSettings"; hostname: string }   // Content Script → BG
  | { type: "updateSettings"; changes: Partial<MoonSettings> } // Popup/Options → BG
  | { type: "toggle" }                           // Popup/Options → BG
  | { type: "enable" }                           // BG → Content Scripts (broadcast)
  | { type: "disable" }                          // BG → Content Scripts (broadcast)
  | { type: "reload" };                          // BG → Content Scripts (broadcast)
```

`GetSettingsResponse`:
```typescript
{ settings: MoonSettings; shouldApply: boolean; css: string }
```

Flow:
- **Content Script** → BG: `{ type: "getSettings", hostname }` on page load — receives CSS + shouldApply
- **Popup/Options** → BG: `{ type: "updateSettings", changes }` — settings saved, then `"reload"` broadcast
- **Popup** → BG: `{ type: "toggle" }` — toggles enabled state, then `"enable"` or `"disable"` broadcast
- **BG** → Content Scripts: `"enable"`, `"disable"`, `"reload"` — broadcast to all tabs via `browser.tabs.query({})`

## CSS Cache

CSS is cached in background (variables `cachedCSS`, `cachedBg`, `cachedFg`) and regenerated only when `backgroundColor` or `textColor` changes. Cache is invalidated:
- On `updateSettings` with a color change
- On `browser.storage.onChanged` from another tab

Cache is **not** invalidated on schedule/exclusion changes — those only affect `shouldApply`, not the CSS itself.

## CSS Generation

`generateCSS()` is a pure function. Derived colors:
| Variable | Formula |
|---|---|
| `tableBg` | `lighten(bg, 4%)` |
| `inputBg` | `darken(bg, 4%)` |
| `inputBorder` | `lighten(bg, 12%)` |
| `btnBg` | `darken(fg, 70%)` |
| `linkColor` | `lighten(fg, 15%)` |
| `codeBg` | `darken(bg, 6%)` |
| `codeColor` | `lighten(fg, 10%)` |

Rules cover: base (`html,body`), text blocks, tables, inputs, buttons, links, code, media (opacity 0.92), scrollbars, and `::selection`. All rules use `!important`.

## Schedule

- Alarms: `"schedule-on"` and `"schedule-off"` — fire daily at `scheduleStart`/`scheduleEnd`
- `isInRange()` handles both same-day (e.g. 08:00–18:00) and overnight (e.g. 20:00–06:00) ranges
- On alarm fire, broadcasts `"enable"`/`"disable"` and re-arms for next day
- Alarms are cleared when `scheduleEnabled` is toggled off

## Exclusion Logic

`isExcluded(hostname, settings)` in `storage.ts`:
- Strips `www.` prefix from both hostname and exclusion entry
- Matches exact domain **or** subdomain (e.g. `sub.example.com` matches entry `example.com`)
- Case-insensitive

## UI (`settings-ui.ts`)

Shared component used by both popup and options. Renders 3 tabs:
1. **Theme** — toggle (enabled/disabled), 2 color pickers (bg + text) with hex input sync, live preview, reset button
2. **Schedule** — toggle, start/end time (HH:MM via number inputs), status text, 24-hour timeline
3. **Exclusions** — text input + Add button, list with × remove buttons

Settings changes are debounced at **200ms** before sending to background.

UI refreshes automatically via `browser.storage.onChanged` listener (handles cross-tab sync).

Popup shows an "Open Settings" link → `browser.runtime.openOptionsPage()`.

## Key Guarantees

- One `<style>` tag (`id="moon-eclipse-theme"`) per page, no DOM traversal or MutationObserver
- Content script is passive — only listens for messages, runs at `document_start`, not in frames
- Background is non-persistent (`"persistent": false`) — wakes only on alarm or message
- Settings merge with DEFAULTS on every read — safe against missing keys from version upgrades
- Final bundles: ~25KB total

## AI Instructions

Rules for AI assistants working on this project. No emojis in code, comments, docs, or commit messages. All code, comments, docs, UI strings, and commit messages must be written in English.

### Audit AGENTS.md Before Changes
Before modifying source code, review this file and update it if the changes introduce new conventions, architecture shifts, or deprecate documented behavior. This file is the single source of truth — keep it in sync with the code.

### Git Hygiene
Commit before starting new work. If the working tree has uncommitted changes, commit them first: `"WIP: checkpoint before [task]"`. Each logical change stays in its own commit.

### Version Bump
Before committing any code change, increment the version in `manifest.json` using semver (`major.minor.patch`). Run `npm run build` afterwards so `release/manifest.json` stays in sync.
