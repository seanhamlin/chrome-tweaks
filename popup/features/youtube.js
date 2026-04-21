/**
 * Popup UI for YouTube Tweaks.
 */

window.Features = window.Features || [];

const YT_SETTINGS_KEY = "youtubeSettings";

const YT_DEFAULTS = {
  hideShorts: true,
  hidePlayables: true,
  hideEndScreen: true,
};

const YT_LABELS = {
  hideShorts: "Hide Shorts",
  hidePlayables: "Hide Playables",
  hideEndScreen: "Hide end-screen overlays",
};

window.Features.push({
  id: "youtube",
  title: "YouTube Tweaks",
  collapsed: true,
  async render(container) {
    const result = await chrome.storage.local.get(YT_SETTINGS_KEY);
    const settings = result[YT_SETTINGS_KEY] ?? { ...YT_DEFAULTS };

    container.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "text-muted";
    hint.textContent = "Active on youtube.com only.";
    container.append(hint);

    for (const [key, label] of Object.entries(YT_LABELS)) {
      const row = document.createElement("div");
      row.className = "toggle-row";

      const labelEl = document.createElement("span");
      labelEl.className = "toggle-label";
      labelEl.textContent = label;

      const toggle = document.createElement("label");
      toggle.className = "toggle";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = settings[key] ?? YT_DEFAULTS[key];
      checkbox.addEventListener("change", async () => {
        const cur =
          (await chrome.storage.local.get(YT_SETTINGS_KEY))[YT_SETTINGS_KEY] ??
          { ...YT_DEFAULTS };
        cur[key] = checkbox.checked;
        await chrome.storage.local.set({ [YT_SETTINGS_KEY]: cur });
      });

      const slider = document.createElement("span");
      slider.className = "slider";

      toggle.append(checkbox, slider);
      row.append(labelEl, toggle);
      container.append(row);
    }
  },
});
