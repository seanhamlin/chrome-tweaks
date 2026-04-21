/**
 * Header-injection feature.
 *
 * Uses declarativeNetRequest to add request headers to every outgoing request.
 * Headers and enabled state are persisted in chrome.storage.local under the
 * key "headerRules".
 */

const HEADER_RULES_KEY = "headerRules";
const DNR_RULE_ID_START = 1000; // leave 1-999 for other features

const DEFAULT_HEADERS = [
  { name: "Fastly-Debug", value: "1", enabled: true },
];

async function loadHeaderRules() {
  const result = await chrome.storage.local.get(HEADER_RULES_KEY);
  return result[HEADER_RULES_KEY] ?? DEFAULT_HEADERS;
}

async function saveHeaderRules(rules) {
  await chrome.storage.local.set({ [HEADER_RULES_KEY]: rules });
}

/**
 * Rebuild declarativeNetRequest rules from the stored header list.
 */
async function applyHeaderRules() {
  const headers = await loadHeaderRules();

  // Remove all existing header-injection rules first.
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const idsToRemove = existing
    .filter((r) => r.id >= DNR_RULE_ID_START)
    .map((r) => r.id);

  const enabledHeaders = headers.filter((h) => h.enabled);

  // Build one rule that sets all enabled headers at once.
  const addRules =
    enabledHeaders.length > 0
      ? [
          {
            id: DNR_RULE_ID_START,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: enabledHeaders.map((h) => ({
                header: h.name,
                operation: "set",
                value: h.value,
              })),
            },
            condition: {
              urlFilter: "*",
              resourceTypes: [
                "main_frame",
                "sub_frame",
                "stylesheet",
                "script",
                "image",
                "font",
                "object",
                "xmlhttprequest",
                "ping",
                "csp_report",
                "media",
                "websocket",
                "webtransport",
                "webbundle",
                "other",
              ],
            },
          },
        ]
      : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: idsToRemove,
    addRules,
  });
}

// Re-apply whenever storage changes (popup edits).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[HEADER_RULES_KEY]) {
    applyHeaderRules();
  }
});

// Apply on startup.
applyHeaderRules();
