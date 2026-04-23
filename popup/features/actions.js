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
    cacheBtn.innerHTML = `<img src="../icons/caching-score.png" width="20" height="20" alt="Caching Score">`;
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
