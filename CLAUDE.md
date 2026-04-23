# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tab Tweaks is a Chrome Manifest V3 extension — a modular web debugging toolkit. No build step, no framework, no dependencies. Vanilla JS with direct DOM manipulation throughout.

## Development

Load as an unpacked extension at `chrome://extensions` (enable Developer Mode). After any code change, click the reload button on the extension card. Content script changes also require reloading the target tab.

## Architecture

### Feature Registration Pattern

Every feature follows a two-part structure:

1. **Popup UI** (`popup/features/<name>.js`) — self-registers into `window.Features`:
   ```js
   window.Features = window.Features || [];
   window.Features.push({ id: "<name>", title: "Display Name", render(container) { ... } });
   ```
2. **Background logic** (`background/<name>.js`) — imported via `importScripts()` in `background/service-worker.js`

`popup/popup.js` iterates the `window.Features` array and renders each into a collapsible section. Load order is controlled by `<script>` tags in `popup/popup.html` (features before `popup.js`).

### Adding a New Feature

1. Create `popup/features/<name>.js` with the registration pattern above
2. Create `background/<name>.js` if background logic is needed
3. Add the popup script tag in `popup/popup.html` (before the `popup.js` line)
4. Add `importScripts` entry in `background/service-worker.js` if there's a background module
5. Add any new permissions to `manifest.json`

### Communication Between Contexts

- **Popup ↔ Background**: `chrome.runtime.sendMessage({ type: "featureName:action", ...data })` — handler returns `true` to keep the async channel open
- **Storage-driven reactivity**: Background and content scripts watch `chrome.storage.onChanged` to react to popup edits without explicit messaging
- **Storage wrapper**: `lib/storage.js` provides `get`/`set`/`onChange` over `chrome.storage.local`; use `chrome.storage.session` for ephemeral per-tab state

### Conventions

- Message types use `featureName:action` format (e.g., `tabReloader:start`, `screenshot:capture`)
- DeclarativeNetRequest rule IDs: 1000+ reserved for headers; new features should use a different range
- Content script `run_at`: use `document_start` for CSS injection that must beat first paint; `document_idle` for DOM-dependent scripts
- Background modules must be resilient to service worker restarts — persist state in storage and restore on load (see `tab-reloader.js` `restoreAlarms()` pattern)
- Popup `render(container)` functions clear and fully rebuild the DOM each call — state lives in `chrome.storage`, not in the popup
