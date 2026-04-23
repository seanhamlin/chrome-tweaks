/**
 * Popup UI for the full-page screenshot feature.
 */

window.Features = window.Features || [];

window.Features.push({
  id: "screenshot",
  title: "Full Page Screenshot",
  render(container) {
    container.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "text-muted";
    hint.textContent =
      "Capture a full-page screenshot of the current tab and save it as a PNG.";

    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-full mt-6";
    btn.textContent = "Capture Screenshot";

    const status = document.createElement("p");
    status.className = "text-muted mt-6";
    status.style.display = "none";

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Capturing\u2026";
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
        btn.disabled = false;
        btn.textContent = "Capture Screenshot";
      }
    });

    container.append(hint, btn, status);
  },
});
