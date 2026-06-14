// === Moon Eclipse: Content Script ===

import type { GetSettingsResponse, MoonMessage } from "../shared/types";

const STYLE_ID = "moon-eclipse-theme";

function injectCSS(css: string): void {
  if (!css) return;
  removeCSS();
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = css;
  // At document_start <head> may not exist yet; <html> always does.
  (document.head || document.documentElement).appendChild(style);
}

function removeCSS(): void {
  const el = document.getElementById(STYLE_ID);
  if (el) el.remove();
}

async function requestAndApply(retries = 0): Promise<void> {
  try {
    const response: GetSettingsResponse = await browser.runtime.sendMessage({
      type: "getSettings",
      hostname: location.hostname,
    } satisfies MoonMessage);
    if (response.shouldApply) {
      injectCSS(response.css);
    } else {
      removeCSS();
    }
  } catch {
    if (retries < 3) {
      const delays = [100, 500, 2000];
      setTimeout(() => requestAndApply(retries + 1), delays[retries]);
    }
  }
}

// Apply on start
requestAndApply();

// Listen for background messages
browser.runtime.onMessage.addListener((msg: MoonMessage) => {
  switch (msg.type) {
    case "enable":
      requestAndApply();
      break;
    case "disable":
      removeCSS();
      break;
    case "reload":
      removeCSS();
      requestAndApply();
      break;
  }
});
