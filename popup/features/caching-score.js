/**
 * Popup UI for the Caching Score scanner feature.
 */

window.Features = window.Features || [];

window.Features.push({
  id: "caching-score",
  title: "Caching Score",
  render(container) {
    container.innerHTML = "";

    const hint = document.createElement("p");
    hint.className = "text-muted";
    hint.textContent = "Scan the current tab's URL on cachingscore.com.";

    const btn = document.createElement("button");
    btn.className = "btn btn-primary btn-full mt-6";
    btn.textContent = "Scan Current Page";
    btn.addEventListener("click", async () => {
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

    container.append(hint, btn);
  },
});
