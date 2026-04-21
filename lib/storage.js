/**
 * Thin wrapper around chrome.storage.local for typed access.
 */
const Storage = {
  async get(key, fallback) {
    const result = await chrome.storage.local.get(key);
    return result[key] ?? fallback;
  },
  set(data) {
    return chrome.storage.local.set(data);
  },
  onChange(key, callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes[key]) {
        callback(changes[key].newValue, changes[key].oldValue);
      }
    });
  },
};
