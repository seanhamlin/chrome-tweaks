/**
 * Popup UI for JSON Formatter.
 */

window.Features = window.Features || [];

const JF_SETTINGS_KEY = "jsonFormatterSettings";
const JF_DEFAULTS = { enabled: true };

window.Features.push({
  id: "json-formatter",
  title: "JSON Formatter",
  collapsed: true,
  async render(container) {
    const result = await chrome.storage.local.get(JF_SETTINGS_KEY);
    const settings = result[JF_SETTINGS_KEY] ?? { ...JF_DEFAULTS };

    container.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "text-muted";
    hint.textContent =
      "Auto-format JSON responses with syntax highlighting and collapsible trees.";
    container.append(hint);

    const row = document.createElement("div");
    row.className = "toggle-row";

    const label = document.createElement("span");
    label.className = "toggle-label";
    label.textContent = "Enable";

    const toggle = document.createElement("label");
    toggle.className = "toggle";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = settings.enabled;
    checkbox.addEventListener("change", async () => {
      const cur =
        (await chrome.storage.local.get(JF_SETTINGS_KEY))[JF_SETTINGS_KEY] ??
        { ...JF_DEFAULTS };
      cur.enabled = checkbox.checked;
      await chrome.storage.local.set({ [JF_SETTINGS_KEY]: cur });
    });

    const slider = document.createElement("span");
    slider.className = "slider";
    toggle.append(checkbox, slider);

    row.append(label, toggle);
    container.append(row);
  },
});
