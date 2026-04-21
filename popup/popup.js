/**
 * Bootstraps the popup by rendering each registered feature into its own section.
 * Sections are collapsible — click the header to toggle. State is persisted.
 */
(async () => {
  const root = document.getElementById("features");
  const COLLAPSED_KEY = "collapsedSections";

  const result = await chrome.storage.local.get(COLLAPSED_KEY);
  const collapsed = result[COLLAPSED_KEY] ?? {};

  for (const feature of window.Features || []) {
    const section = document.createElement("section");
    section.className = "feature-section";
    section.id = `feature-${feature.id}`;

    // Default collapsed state: use stored preference, else feature's default
    const isCollapsed =
      collapsed[feature.id] !== undefined
        ? collapsed[feature.id]
        : feature.collapsed === true;

    if (isCollapsed) section.classList.add("collapsed");

    const header = document.createElement("div");
    header.className = "feature-header";

    const icon = document.createElement("span");
    icon.className = "collapse-icon";
    icon.textContent = "\u25BC";

    const title = document.createElement("h2");
    title.textContent = feature.title;

    header.append(icon, title);

    header.addEventListener("click", async () => {
      section.classList.toggle("collapsed");
      const res = await chrome.storage.local.get(COLLAPSED_KEY);
      const state = res[COLLAPSED_KEY] ?? {};
      state[feature.id] = section.classList.contains("collapsed");
      await chrome.storage.local.set({ [COLLAPSED_KEY]: state });
    });

    const body = document.createElement("div");
    body.className = "feature-body";

    section.append(header, body);
    root.append(section);

    await feature.render(body);
  }
})();
