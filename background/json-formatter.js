/**
 * JSON Formatter — background module.
 *
 * Listens for main_frame responses with a JSON Content-Type
 * (application/json or application/vnd.api+json) and records matching
 * tab IDs so the content script knows when to activate.
 *
 * Uses chrome.storage.session so the state survives service worker restarts
 * within the same browser session.
 */

const JF_SESSION_KEY = "jsonFormatterTabs";

async function markTab(tabId, isJson) {
  const result = await chrome.storage.session.get(JF_SESSION_KEY);
  const tabs = result[JF_SESSION_KEY] ?? {};
  if (isJson) {
    tabs[String(tabId)] = true;
  } else {
    delete tabs[String(tabId)];
  }
  await chrome.storage.session.set({ [JF_SESSION_KEY]: tabs });
}

async function isJsonTab(tabId) {
  const result = await chrome.storage.session.get(JF_SESSION_KEY);
  const tabs = result[JF_SESSION_KEY] ?? {};
  return !!tabs[String(tabId)];
}

chrome.webRequest.onHeadersReceived.addListener(
  (details) => {
    if (details.type !== "main_frame") return;

    const contentType = details.responseHeaders?.find(
      (h) => h.name.toLowerCase() === "content-type"
    );

    const value = contentType?.value?.toLowerCase() ?? "";
    const isJson =
      value.includes("application/json") ||
      value.includes("application/vnd.api+json");

    markTab(details.tabId, isJson);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

// Clean up when tabs close.
chrome.tabs.onRemoved.addListener((tabId) => {
  markTab(tabId, false);
});

// Content script asks whether this tab had a JSON response.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "jsonFormatter:isJson") return false;

  const tabId = sender.tab?.id;
  if (tabId == null) {
    sendResponse({ isJson: false });
    return false;
  }

  isJsonTab(tabId).then((isJson) => sendResponse({ isJson }));
  return true; // async response
});
