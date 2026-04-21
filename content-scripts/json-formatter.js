/**
 * JSON Formatter — content script.
 *
 * Detects pages that contain raw JSON and replaces them with a formatted,
 * syntax-highlighted, collapsible tree view. Includes a toolbar to toggle
 * between parsed and raw views, and copy to clipboard.
 */

(() => {
  "use strict";

  // ── Detection ──────────────────────────────────────────────

  // Only act on top-level documents (not iframes).
  if (window !== window.top) return;

  const SETTINGS_KEY = "jsonFormatterSettings";
  const DEFAULT_SETTINGS = { enabled: true };

  /**
   * Try to extract JSON from the page body text.
   *
   * Chrome renders JSON responses in different ways depending on version
   * and flags: sometimes a <pre> wrapper, sometimes a raw text node,
   * sometimes inside Chrome's built-in JSON viewer. We try several
   * strategies since the background already confirmed the content-type.
   */
  function extractJSON() {
    const body = document.body;
    if (!body) return null;

    // Strategy 1: <pre> element (most common in Chrome)
    const pre = body.querySelector("pre");
    if (pre) {
      const raw = pre.textContent.trim();
      if (raw) {
        try {
          return { raw, parsed: JSON.parse(raw) };
        } catch {}
      }
    }

    // Strategy 2: raw body text (no wrapper elements)
    const raw = body.textContent.trim();
    if (!raw) return null;

    try {
      return { raw, parsed: JSON.parse(raw) };
    } catch {
      return null;
    }
  }

  // ── Rendering ──────────────────────────────────────────────

  const INDENT = 20; // px per nesting level

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isUrl(str) {
    return /^https?:\/\/[^\s"<>]+$/i.test(str);
  }

  /**
   * Build the DOM tree for a JSON value.
   * Returns a document fragment.
   */
  function renderValue(value, depth) {
    if (value === null) return spanWith("jf-null", "null");
    if (typeof value === "boolean")
      return spanWith("jf-bool", String(value));
    if (typeof value === "number")
      return spanWith("jf-number", String(value));
    if (typeof value === "string") {
      const escaped = escapeHtml(value);
      if (isUrl(value)) {
        const a = document.createElement("a");
        a.href = value;
        a.className = "jf-string jf-url";
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = `"${value}"`;
        return a;
      }
      return spanWith("jf-string", `"${escaped}"`);
    }

    if (Array.isArray(value)) return renderArray(value, depth);
    if (typeof value === "object") return renderObject(value, depth);

    return spanWith("jf-unknown", String(value));
  }

  function spanWith(cls, text) {
    const s = document.createElement("span");
    s.className = cls;
    s.innerHTML = text;
    return s;
  }

  function renderObject(obj, depth) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return spanWith("jf-brace", "{}");

    const container = document.createElement("span");
    container.className = "jf-collapsible";

    // Toggle arrow
    const toggle = document.createElement("span");
    toggle.className = "jf-toggle";
    toggle.textContent = "\u25BC";

    // Opening brace
    const open = spanWith("jf-brace", "{");

    // Collapsed preview
    const preview = document.createElement("span");
    preview.className = "jf-preview";
    preview.textContent = `\u2026${keys.length} ${keys.length === 1 ? "key" : "keys"}`;
    preview.style.display = "none";

    // Closing brace (collapsed, inline)
    const closeInline = spanWith("jf-brace jf-close-inline", "}");
    closeInline.style.display = "none";

    // Children
    const childBlock = document.createElement("div");
    childBlock.className = "jf-block";

    keys.forEach((key, i) => {
      const line = document.createElement("div");
      line.className = "jf-line";
      line.style.paddingLeft = `${INDENT}px`;

      const keySpan = spanWith("jf-key", `"${escapeHtml(key)}"`);
      const colon = spanWith("jf-colon", ": ");

      line.append(keySpan, colon, renderValue(obj[key], depth + 1));

      if (i < keys.length - 1) {
        line.append(spanWith("jf-comma", ","));
      }

      childBlock.append(line);
    });

    // Closing brace on its own line
    const closeLine = document.createElement("div");
    closeLine.className = "jf-line";
    const closeBrace = spanWith("jf-brace", "}");
    closeLine.append(closeBrace);

    // Toggle behaviour
    toggle.addEventListener("click", () => {
      const collapsed = childBlock.style.display === "none";
      childBlock.style.display = collapsed ? "" : "none";
      closeLine.style.display = collapsed ? "" : "none";
      preview.style.display = collapsed ? "none" : "";
      closeInline.style.display = collapsed ? "none" : "";
      toggle.textContent = collapsed ? "\u25BC" : "\u25B6";
      toggle.classList.toggle("jf-collapsed", !collapsed);
    });

    container.append(toggle, open, preview, closeInline, childBlock, closeLine);

    // Auto-collapse deeply nested or large objects
    if (depth >= 3 || keys.length > 20) {
      toggle.click();
    }

    return container;
  }

  function renderArray(arr, depth) {
    if (arr.length === 0) return spanWith("jf-brace", "[]");

    const container = document.createElement("span");
    container.className = "jf-collapsible";

    const toggle = document.createElement("span");
    toggle.className = "jf-toggle";
    toggle.textContent = "\u25BC";

    const open = spanWith("jf-brace", "[");

    const preview = document.createElement("span");
    preview.className = "jf-preview";
    preview.textContent = `\u2026${arr.length} ${arr.length === 1 ? "item" : "items"}`;
    preview.style.display = "none";

    const closeInline = spanWith("jf-brace jf-close-inline", "]");
    closeInline.style.display = "none";

    const childBlock = document.createElement("div");
    childBlock.className = "jf-block";

    arr.forEach((item, i) => {
      const line = document.createElement("div");
      line.className = "jf-line";
      line.style.paddingLeft = `${INDENT}px`;

      line.append(renderValue(item, depth + 1));

      if (i < arr.length - 1) {
        line.append(spanWith("jf-comma", ","));
      }

      childBlock.append(line);
    });

    const closeLine = document.createElement("div");
    closeLine.className = "jf-line";
    closeLine.append(spanWith("jf-brace", "]"));

    toggle.addEventListener("click", () => {
      const collapsed = childBlock.style.display === "none";
      childBlock.style.display = collapsed ? "" : "none";
      closeLine.style.display = collapsed ? "" : "none";
      preview.style.display = collapsed ? "none" : "";
      closeInline.style.display = collapsed ? "none" : "";
      toggle.textContent = collapsed ? "\u25BC" : "\u25B6";
      toggle.classList.toggle("jf-collapsed", !collapsed);
    });

    container.append(toggle, open, preview, closeInline, childBlock, closeLine);

    if (depth >= 3 || arr.length > 20) {
      toggle.click();
    }

    return container;
  }

  // ── Toolbar ────────────────────────────────────────────────

  function createToolbar(raw) {
    const bar = document.createElement("div");
    bar.id = "jf-toolbar";

    const formattedBtn = document.createElement("button");
    formattedBtn.textContent = "Parsed";
    formattedBtn.className = "jf-tab active";

    const rawBtn = document.createElement("button");
    rawBtn.textContent = "Raw";
    rawBtn.className = "jf-tab";

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.className = "jf-action";

    const collapseAll = document.createElement("button");
    collapseAll.textContent = "Collapse All";
    collapseAll.className = "jf-action";

    const expandAll = document.createElement("button");
    expandAll.textContent = "Expand All";
    expandAll.className = "jf-action";

    const left = document.createElement("div");
    left.className = "jf-tab-group";
    left.append(formattedBtn, rawBtn);

    const right = document.createElement("div");
    right.className = "jf-action-group";
    right.append(expandAll, collapseAll, copyBtn);

    bar.append(left, right);

    // Handlers
    formattedBtn.addEventListener("click", () => {
      document.getElementById("jf-formatted").style.display = "";
      document.getElementById("jf-raw").style.display = "none";
      formattedBtn.classList.add("active");
      rawBtn.classList.remove("active");
    });

    rawBtn.addEventListener("click", () => {
      document.getElementById("jf-formatted").style.display = "none";
      document.getElementById("jf-raw").style.display = "block";
      rawBtn.classList.add("active");
      formattedBtn.classList.remove("active");
    });

    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(raw).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1500);
      });
    });

    collapseAll.addEventListener("click", () => {
      document
        .querySelectorAll("#jf-formatted .jf-toggle:not(.jf-collapsed)")
        .forEach((t) => t.click());
    });

    expandAll.addEventListener("click", () => {
      document
        .querySelectorAll("#jf-formatted .jf-toggle.jf-collapsed")
        .forEach((t) => t.click());
    });

    return bar;
  }

  // ── Styles ─────────────────────────────────────────────────

  function injectStyles() {
    const style = document.createElement("style");
    style.id = "jf-styles";
    style.textContent = `
      body.jf-active {
        margin: 0;
        padding: 0;
        background: #fff;
        font-family: "SF Mono", "Fira Code", "Cascadia Code", Menlo, Consolas, monospace;
        font-size: 13px;
        line-height: 1.5;
        color: #333;
      }

      /* ── Toolbar ─────────────────────────────────── */
      #jf-toolbar {
        position: sticky;
        top: 0;
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 16px;
        background: #f8f8f8;
        border-bottom: 1px solid #e0e0e0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 12px;
      }

      .jf-tab-group, .jf-action-group {
        display: flex;
        gap: 2px;
      }

      .jf-tab, .jf-action {
        padding: 4px 12px;
        border: 1px solid #d0d0d0;
        background: #fff;
        cursor: pointer;
        font-size: 12px;
        font-family: inherit;
        color: #555;
        transition: all 0.15s;
      }

      .jf-tab:first-child { border-radius: 4px 0 0 4px; }
      .jf-tab:last-child  { border-radius: 0 4px 4px 0; }
      .jf-tab + .jf-tab   { border-left: none; }

      .jf-tab.active {
        background: #4f46e5;
        border-color: #4f46e5;
        color: #fff;
      }

      .jf-action {
        border-radius: 4px;
        margin-left: 4px;
      }

      .jf-action:hover {
        background: #eee;
      }

      /* ── Content area ────────────────────────────── */
      #jf-formatted, #jf-raw {
        padding: 16px 20px;
        white-space: pre-wrap;
        word-wrap: break-word;
      }

      #jf-raw {
        display: none;
        color: #333;
      }

      /* ── Tree elements ───────────────────────────── */
      .jf-line {
        position: relative;
      }

      .jf-toggle {
        display: inline-block;
        width: 14px;
        cursor: pointer;
        font-size: 9px;
        color: #999;
        text-align: center;
        user-select: none;
        vertical-align: middle;
        margin-right: 2px;
        transition: color 0.15s;
      }

      .jf-toggle:hover {
        color: #4f46e5;
      }

      .jf-preview {
        color: #999;
        font-style: italic;
        font-size: 12px;
        margin-left: 4px;
      }

      .jf-close-inline {
        margin-left: 0;
      }

      .jf-block {
        border-left: 1px solid #e8e8e8;
        margin-left: 7px;
      }

      .jf-block:hover {
        border-left-color: #c0c0c0;
      }

      /* ── Syntax colours ──────────────────────────── */
      .jf-key {
        color: #881391;
      }

      .jf-string {
        color: #c41a16;
      }

      .jf-number {
        color: #1c00cf;
      }

      .jf-bool {
        color: #0d22aa;
        font-weight: 600;
      }

      .jf-null {
        color: #808080;
        font-weight: 600;
      }

      .jf-brace {
        color: #333;
        font-weight: 600;
      }

      .jf-colon {
        color: #333;
      }

      .jf-comma {
        color: #333;
      }

      .jf-url {
        text-decoration: underline;
        cursor: pointer;
      }

      .jf-url:hover {
        color: #4f46e5;
      }

      /* ── Line hover ──────────────────────────────── */
      .jf-line:hover {
        background: #f5f5ff;
      }

      /* ── Dark mode ───────────────────────────────── */
      @media (prefers-color-scheme: dark) {
        body.jf-active {
          background: #1e1e1e;
          color: #d4d4d4;
        }

        #jf-toolbar {
          background: #252526;
          border-bottom-color: #3c3c3c;
        }

        .jf-tab, .jf-action {
          background: #2d2d2d;
          border-color: #3c3c3c;
          color: #ccc;
        }

        .jf-tab.active {
          background: #4f46e5;
          border-color: #4f46e5;
          color: #fff;
        }

        .jf-action:hover {
          background: #3c3c3c;
        }

        #jf-raw { color: #d4d4d4; }

        .jf-key    { color: #9cdcfe; }
        .jf-string { color: #ce9178; }
        .jf-number { color: #b5cea8; }
        .jf-bool   { color: #569cd6; }
        .jf-null   { color: #808080; }
        .jf-brace  { color: #d4d4d4; }
        .jf-colon  { color: #d4d4d4; }
        .jf-comma  { color: #d4d4d4; }

        .jf-url:hover { color: #818cf8; }

        .jf-block {
          border-left-color: #3c3c3c;
        }

        .jf-block:hover {
          border-left-color: #555;
        }

        .jf-line:hover {
          background: #2a2a3a;
        }

        .jf-toggle:hover {
          color: #818cf8;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Page replacement ────────────────────────────────────────

  function formatPage(data) {
    const prettyRaw = JSON.stringify(data.parsed, null, 2);

    injectStyles();
    document.body.innerHTML = "";
    document.body.className = "jf-active";

    document.body.append(createToolbar(prettyRaw));

    const formatted = document.createElement("div");
    formatted.id = "jf-formatted";
    formatted.append(renderValue(data.parsed, 0));
    document.body.append(formatted);

    const raw = document.createElement("pre");
    raw.id = "jf-raw";
    raw.textContent = prettyRaw;
    document.body.append(raw);
  }

  // ── Init ───────────────────────────────────────────────────

  async function init() {
    // Check if feature is enabled
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] ?? DEFAULT_SETTINGS;
    if (!settings.enabled) return;

    // Ask the background script whether this tab had a JSON content-type.
    const { isJson } = await chrome.runtime.sendMessage({
      type: "jsonFormatter:isJson",
    });

    if (!isJson) return;

    // The response had application/json — try to parse the body content.
    const data = extractJSON();
    if (!data) return;

    formatPage(data);
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
