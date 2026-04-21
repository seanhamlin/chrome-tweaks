/**
 * Popup UI for Tab Reloader.
 */

window.Features = window.Features || [];

const INTERVAL_PRESETS = [
  { label: "10 sec", ms: 10 * 1000 },
  { label: "30 sec", ms: 30 * 1000 },
  { label: "1 min", ms: 60 * 1000 },
  { label: "5 min", ms: 5 * 60 * 1000 },
  { label: "15 min", ms: 15 * 60 * 1000 },
  { label: "30 min", ms: 30 * 60 * 1000 },
  { label: "1 hour", ms: 60 * 60 * 1000 },
  { label: "2 hours", ms: 2 * 60 * 60 * 1000 },
  { label: "6 hours", ms: 6 * 60 * 60 * 1000 },
  { label: "12 hours", ms: 12 * 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
];

window.Features.push({
  id: "tab-reloader",
  title: "Tab Reloader",
  collapsed: true,
  async render(container) {
    container.innerHTML = "";

    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      container.textContent = "No active tab.";
      return;
    }

    // Get current state from background
    const state = await chrome.runtime.sendMessage({
      type: "tabReloader:getState",
      tabId: tab.id,
    });

    // --- Status line ---
    const status = document.createElement("p");
    status.className = "text-muted";
    status.textContent = state.active
      ? "Auto-reload is ON for this tab."
      : "Auto-reload is OFF for this tab.";
    container.append(status);

    // --- Interval selector ---
    const intervalRow = document.createElement("div");
    intervalRow.className = "toggle-row";

    const intervalLabel = document.createElement("span");
    intervalLabel.className = "toggle-label";
    intervalLabel.textContent = "Interval";

    const select = document.createElement("select");
    select.className = "select-input";
    for (const preset of INTERVAL_PRESETS) {
      const opt = document.createElement("option");
      opt.value = preset.ms;
      opt.textContent = preset.label;
      if (preset.ms === state.intervalMs) opt.selected = true;
      select.append(opt);
    }

    // If the current interval doesn't match any preset, add a custom entry
    if (!INTERVAL_PRESETS.some((p) => p.ms === state.intervalMs)) {
      const opt = document.createElement("option");
      opt.value = state.intervalMs;
      opt.textContent = formatMs(state.intervalMs);
      opt.selected = true;
      select.prepend(opt);
    }

    intervalRow.append(intervalLabel, select);
    container.append(intervalRow);

    // --- Toggle button ---
    const toggleRow = document.createElement("div");
    toggleRow.className = "toggle-row";

    const toggleLabel = document.createElement("span");
    toggleLabel.className = "toggle-label";
    toggleLabel.textContent = "Enable for this tab";

    const toggle = document.createElement("label");
    toggle.className = "toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state.active;

    const slider = document.createElement("span");
    slider.className = "slider";
    toggle.append(checkbox, slider);

    toggleRow.append(toggleLabel, toggle);
    container.append(toggleRow);

    // --- Event handlers ---
    checkbox.addEventListener("change", async () => {
      if (checkbox.checked) {
        const intervalMs = parseInt(select.value, 10);
        await chrome.runtime.sendMessage({
          type: "tabReloader:start",
          tabId: tab.id,
          intervalMs,
        });
        status.textContent = "Auto-reload is ON for this tab.";
      } else {
        await chrome.runtime.sendMessage({
          type: "tabReloader:stop",
          tabId: tab.id,
        });
        status.textContent = "Auto-reload is OFF for this tab.";
      }
    });

    select.addEventListener("change", async () => {
      const intervalMs = parseInt(select.value, 10);
      // Save as new default
      await chrome.runtime.sendMessage({
        type: "tabReloader:setDefault",
        intervalMs,
      });
      // If currently active, restart with new interval
      if (checkbox.checked) {
        await chrome.runtime.sendMessage({
          type: "tabReloader:start",
          tabId: tab.id,
          intervalMs,
        });
      }
    });
  },
});

function formatMs(ms) {
  if (ms < 60000) return Math.round(ms / 1000) + " sec";
  if (ms < 3600000) return Math.round(ms / 60000) + " min";
  return Math.round(ms / 3600000) + " hour" + (ms >= 7200000 ? "s" : "");
}
