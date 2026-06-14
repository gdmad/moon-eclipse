// === Moon Eclipse: Popup Entry Point ===

import { renderSettingsUI } from "../shared/settings-ui";

document.addEventListener("DOMContentLoaded", () => {
  const container = document.getElementById("app");
  if (container) {
    renderSettingsUI(container);
  }
});
