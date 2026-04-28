/**
 * Popup UI for quick-action buttons (caching score, screenshot, etc.).
 */

window.Features = window.Features || [];

window.Features.push({
  id: "actions",
  title: "Actions",
  render(container) {
    container.innerHTML = "";

    const row = document.createElement("div");
    row.className = "actions-row";

    const status = document.createElement("p");
    status.className = "text-muted mt-6";
    status.style.display = "none";

    // ── Caching Score ──────────────────────────────────────
    const cacheBtn = document.createElement("button");
    cacheBtn.className = "btn btn-icon";
    cacheBtn.title = "Scan caching score";
    cacheBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 454.34 423.37" fill="currentColor">
      <path d="M230.01,308.23c-19.85,0-38.93-5.98-55.16-17.3c-15.85-11.05-27.91-26.38-34.87-44.34c-2.5-6.44,0.7-13.68,7.13-16.17c6.44-2.5,13.68,0.7,16.17,7.13c10.6,27.32,37.41,45.68,66.72,45.68c25.08,0,48.33-13.44,61.16-34.43l-144.05-55.84c-3.09-1.2-5.58-3.58-6.92-6.61c-1.34-3.03-1.42-6.47-0.22-9.57c6.96-17.95,19.02-33.28,34.87-44.34c16.23-11.32,35.31-17.3,55.16-17.3s38.93,5.98,55.16,17.3c15.85,11.05,27.91,26.38,34.87,44.34c2.5,6.44-0.7,13.68-7.13,16.17c-6.44,2.5-13.68-0.7-16.17-7.13c-10.6-27.32-37.41-45.68-66.72-45.68c-25.08,0-48.33,13.44-61.16,34.43l144.05,55.84c3.09,1.2,5.58,3.58,6.92,6.61c1.34,3.03,1.42,6.47,0.22,9.57c-6.96,17.95-19.02,33.28-34.87,44.34C268.93,302.25,249.86,308.23,230.01,308.23z"/>
      <path d="M230.01,391.63c-99.22,0-179.94-80.72-179.94-179.94S130.79,31.75,230.01,31.75c81.38,0,152.87,54.85,173.85,133.4c1.78,6.67-2.18,13.52-8.85,15.3c-6.67,1.78-13.52-2.18-15.3-8.85c-18.06-67.62-79.62-114.85-149.7-114.85c-85.43,0-154.94,69.51-154.94,154.94s69.51,154.94,154.94,154.94c70.08,0,131.63-47.23,149.7-114.85c1.78-6.67,8.63-10.63,15.3-8.85c6.67,1.78,10.63,8.63,8.85,15.3C382.87,336.77,311.39,391.63,230.01,391.63z"/>
    </svg>`;
    cacheBtn.addEventListener("click", async () => {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.url) return;
      const scanUrl =
        "https://www.cachingscore.com/scan?q=" +
        encodeURIComponent(tab.url) +
        "&followRedirects=on";
      chrome.tabs.create({ url: scanUrl });
    });

    // ── Screenshot ─────────────────────────────────────────
    const screenshotBtn = document.createElement("button");
    screenshotBtn.className = "btn btn-icon";
    screenshotBtn.title = "Full page screenshot";
    screenshotBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>`;
    screenshotBtn.addEventListener("click", async () => {
      screenshotBtn.disabled = true;
      status.style.display = "none";

      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id) throw new Error("No active tab found");

        const resp = await chrome.runtime.sendMessage({
          type: "screenshot:capture",
          tabId: tab.id,
        });

        if (resp?.error) throw new Error(resp.error);

        status.textContent = "Screenshot saved to Downloads.";
        status.style.color = "";
        status.style.display = "";
      } catch (err) {
        status.textContent = "Error: " + err.message;
        status.style.color = "var(--clr-danger, #ef4444)";
        status.style.display = "";
      } finally {
        screenshotBtn.disabled = false;
      }
    });

    // ── Clear Cookies ────────────────────────────────────────
    const cookieBtn = document.createElement("button");
    cookieBtn.className = "btn btn-icon";
    cookieBtn.title = "Clear cookies for this domain";
    cookieBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
      <circle cx="8" cy="14" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="14" cy="10" r="1"/>
    </svg>`;
    cookieBtn.addEventListener("click", async () => {
      cookieBtn.disabled = true;
      status.style.display = "none";

      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.url) throw new Error("No active tab found");

        const url = new URL(tab.url);
        const cookies = await chrome.cookies.getAll({ domain: url.hostname });

        for (const cookie of cookies) {
          const cookieUrl =
            (cookie.secure ? "https://" : "http://") +
            cookie.domain.replace(/^\./, "") +
            cookie.path;
          await chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
        }

        status.textContent = `Cleared ${cookies.length} cookie${cookies.length !== 1 ? "s" : ""} for ${url.hostname}`;
        status.style.color = "";
        status.style.display = "";
      } catch (err) {
        status.textContent = "Error: " + err.message;
        status.style.color = "var(--clr-danger, #ef4444)";
        status.style.display = "";
      } finally {
        cookieBtn.disabled = false;
      }
    });

    row.append(cacheBtn, screenshotBtn, cookieBtn);
    container.append(row, status);
  },
});
