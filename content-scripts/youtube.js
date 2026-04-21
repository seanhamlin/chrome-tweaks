/**
 * YouTube Tweaks — content script.
 *
 * Injects CSS to hide Shorts, Playables, and end-screen overlays
 * based on user preferences stored in chrome.storage.local.
 */

const YT_SETTINGS_KEY = "youtubeSettings";

const DEFAULT_SETTINGS = {
  hideShorts: true,
  hidePlayables: true,
  hideEndScreen: true,
};

const STYLE_ID = "tab-tweaks-youtube";

/**
 * CSS selectors for each feature.
 *
 * YouTube's DOM is a maze of web components; these selectors cover the
 * primary surfaces where Shorts, Playables, and end-screen cards appear.
 */
const CSS_RULES = {
  hideShorts: `
    /* Shorts shelf on home / search / subscriptions */
    ytd-rich-shelf-renderer[is-shorts],
    ytd-reel-shelf-renderer,
    /* Shorts tab in channel pages */
    tp-yt-paper-tab:has(> .tab-content > yt-tab-shape[tab-title="Shorts"]),
    /* Shorts entries in sidebar / guide */
    ytd-guide-entry-renderer a[title="Shorts"],
    ytd-mini-guide-entry-renderer a[title="Shorts"],
    /* Shorts badges & links in results */
    ytd-video-renderer:has(a[href*="/shorts/"]),
    ytd-grid-video-renderer:has(a[href*="/shorts/"]),
    ytd-compact-video-renderer:has(a[href*="/shorts/"]),
    /* Navigation endpoint chips */
    yt-chip-cloud-chip-renderer:has(yt-formatted-string[title="Shorts"]) {
      display: none !important;
    }
  `,

  hidePlayables: `
    /* Playables shelf on home */
    ytd-rich-shelf-renderer[is-playables],
    ytd-rich-shelf-renderer:has(span#title:not(:empty)):has([href*="/playables"]),
    /* Playables section renderer */
    ytd-reel-shelf-renderer:has(a[href*="/playables"]),
    /* Individual playable items in feeds */
    ytd-rich-item-renderer:has(a[href*="/playables"]),
    ytd-compact-video-renderer:has(a[href*="/playables"]) {
      display: none !important;
    }
  `,

  hideEndScreen: `
    /* End screen cards / annotations overlay */
    .ytp-ce-element,
    .ytp-ce-covering-overlay,
    .ytp-ce-element-shadow,
    .ytp-endscreen-content,
    .ytp-ce-covering-image,
    .ytp-ce-expanding-image,
    .ytp-ce-video,
    .ytp-ce-playlist,
    .ytp-ce-website,
    .ytp-ce-channel,
    .html5-endscreen {
      display: none !important;
    }
  `,
};

function buildStylesheet(settings) {
  let css = "";
  for (const [key, enabled] of Object.entries(settings)) {
    if (enabled && CSS_RULES[key]) {
      css += CSS_RULES[key] + "\n";
    }
  }
  return css;
}

function injectStyles(settings) {
  let el = document.getElementById(STYLE_ID);
  const css = buildStylesheet(settings);

  if (!css) {
    if (el) el.remove();
    return;
  }

  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ID;
    (document.head || document.documentElement).appendChild(el);
  }

  el.textContent = css;
}

async function init() {
  const result = await chrome.storage.local.get(YT_SETTINGS_KEY);
  const settings = result[YT_SETTINGS_KEY] ?? DEFAULT_SETTINGS;
  injectStyles(settings);
}

// React to setting changes from the popup without needing a page reload.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[YT_SETTINGS_KEY]) {
    injectStyles(changes[YT_SETTINGS_KEY].newValue ?? DEFAULT_SETTINGS);
  }
});

init();
