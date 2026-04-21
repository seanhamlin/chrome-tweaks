/**
 * Tab Reloader — background module.
 *
 * Maintains a map of tabId → { intervalMs, alarmName } for tabs that have
 * auto-reload enabled. Uses chrome.alarms (MV3-friendly, survives service
 * worker restarts) to trigger reloads.
 *
 * State is persisted in chrome.storage.local under "tabReloader" so it
 * survives service worker restarts. The default interval stored in
 * "tabReloaderInterval" (ms).
 */

const TR_KEY = "tabReloader";           // { [tabId]: intervalMs }
const TR_INTERVAL_KEY = "tabReloaderInterval";
const TR_DEFAULT_INTERVAL = 60 * 60 * 1000; // 1 hour
const TR_ALARM_PREFIX = "tab-reload-";

/** Restore alarms for any tabs that were being reloaded before a SW restart. */
async function restoreAlarms() {
  const result = await chrome.storage.local.get(TR_KEY);
  const tabs = result[TR_KEY] ?? {};

  for (const [tabId, intervalMs] of Object.entries(tabs)) {
    const name = TR_ALARM_PREFIX + tabId;
    const existing = await chrome.alarms.get(name);
    if (!existing) {
      chrome.alarms.create(name, { periodInMinutes: intervalMs / 60000 });
    }
  }
}

/** Start reloading a tab at the given interval (ms). */
async function startReloading(tabId, intervalMs) {
  const result = await chrome.storage.local.get(TR_KEY);
  const tabs = result[TR_KEY] ?? {};
  tabs[String(tabId)] = intervalMs;
  await chrome.storage.local.set({ [TR_KEY]: tabs });

  const name = TR_ALARM_PREFIX + tabId;
  await chrome.alarms.clear(name);
  chrome.alarms.create(name, { periodInMinutes: intervalMs / 60000 });
}

/** Stop reloading a tab. */
async function stopReloading(tabId) {
  const result = await chrome.storage.local.get(TR_KEY);
  const tabs = result[TR_KEY] ?? {};
  delete tabs[String(tabId)];
  await chrome.storage.local.set({ [TR_KEY]: tabs });

  await chrome.alarms.clear(TR_ALARM_PREFIX + tabId);
}

// Handle alarm fires — reload the corresponding tab.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(TR_ALARM_PREFIX)) return;

  const tabId = parseInt(alarm.name.slice(TR_ALARM_PREFIX.length), 10);
  try {
    await chrome.tabs.reload(tabId);
  } catch {
    // Tab was closed — clean up.
    await stopReloading(tabId);
  }
});

// Clean up when a tab is closed.
chrome.tabs.onRemoved.addListener((tabId) => {
  stopReloading(tabId);
});

// Handle messages from the popup.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "tabReloader:getState") {
    chrome.storage.local.get([TR_KEY, TR_INTERVAL_KEY]).then((result) => {
      const tabs = result[TR_KEY] ?? {};
      const defaultInterval = result[TR_INTERVAL_KEY] ?? TR_DEFAULT_INTERVAL;
      const entry = tabs[String(msg.tabId)];
      sendResponse({
        active: !!entry,
        intervalMs: entry ?? defaultInterval,
        defaultIntervalMs: defaultInterval,
      });
    });
    return true; // async response
  }

  if (msg.type === "tabReloader:start") {
    startReloading(msg.tabId, msg.intervalMs).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "tabReloader:stop") {
    stopReloading(msg.tabId).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "tabReloader:setDefault") {
    chrome.storage.local.set({ [TR_INTERVAL_KEY]: msg.intervalMs }).then(() =>
      sendResponse({ ok: true })
    );
    return true;
  }
});

restoreAlarms();
