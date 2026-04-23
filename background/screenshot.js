/**
 * Full-page screenshot capture.
 *
 * Scrolls through the active tab viewport-by-viewport, captures each slice
 * with captureVisibleTab, then stitches them on a canvas inside the tab and
 * triggers a PNG download.
 */

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "screenshot:capture") return;
  captureFullPage(msg.tabId)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true; // keep channel open for async response
});

async function captureFullPage(tabId) {
  // 1. Collect dimensions and hide the scrollbar so it doesn't appear in shots
  const [{ result: info }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const ox = window.scrollX;
      const oy = window.scrollY;
      document.documentElement.style.setProperty("overflow", "hidden", "important");
      return {
        totalHeight: Math.max(
          document.documentElement.scrollHeight,
          document.documentElement.clientHeight
        ),
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: window.innerHeight,
        dpr: window.devicePixelRatio || 1,
        ox,
        oy,
      };
    },
  });

  const { totalHeight, viewportWidth, viewportHeight, dpr, ox, oy } = info;
  const captures = [];

  try {
    for (let y = 0; y < totalHeight; y += viewportHeight) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (sy) => window.scrollTo(0, sy),
        args: [y],
      });

      // Give the page time to paint and stay within the
      // MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND quota (2/sec).
      await new Promise((r) => setTimeout(r, 550));

      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: "png",
      });

      const sliceHeight = Math.min(viewportHeight, totalHeight - y);
      captures.push({ dataUrl, y, sliceHeight });
    }
  } finally {
    // Restore original scroll position and overflow
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (x, y) => {
        document.documentElement.style.removeProperty("overflow");
        window.scrollTo(x, y);
      },
      args: [ox, oy],
    });
  }

  // 2. Stitch captures on a canvas inside the tab and trigger download
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (caps, vw, th, vh, dpr) => {
      const canvas = document.createElement("canvas");
      canvas.width = vw * dpr;
      canvas.height = th * dpr;
      const ctx = canvas.getContext("2d");

      let remaining = caps.length;
      caps.forEach((cap) => {
        const img = new Image();
        img.onload = () => {
          // For the last slice the browser can't scroll past the bottom, so the
          // captured image contains overlap at the top — crop it away.
          const srcY = (vh - cap.sliceHeight) * dpr;
          const srcH = cap.sliceHeight * dpr;
          ctx.drawImage(
            img,
            0,
            srcY,
            vw * dpr,
            srcH,
            0,
            cap.y * dpr,
            vw * dpr,
            srcH
          );
          remaining--;
          if (remaining === 0) {
            canvas.toBlob((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              const ts = new Date()
                .toISOString()
                .slice(0, 19)
                .replace(/[T:]/g, "-");
              a.download = `screenshot-${ts}.png`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 5000);
            }, "image/png");
          }
        };
        img.src = cap.dataUrl;
      });
    },
    args: [captures, viewportWidth, totalHeight, viewportHeight, dpr],
  });

  return { success: true };
}
