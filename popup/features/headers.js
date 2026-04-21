/**
 * Popup UI for the header-injection feature.
 *
 * Registers itself into the global `Features` array so popup.js can render it.
 */

const HEADER_RULES_KEY = "headerRules";
const DEFAULT_HEADERS = [
  { name: "Fastly-Debug", value: "1", enabled: true },
];

window.Features = window.Features || [];

window.Features.push({
  id: "headers",
  title: "Request Headers",
  render,
});

async function getHeaders() {
  const result = await chrome.storage.local.get(HEADER_RULES_KEY);
  return result[HEADER_RULES_KEY] ?? DEFAULT_HEADERS;
}

function saveHeaders(headers) {
  return chrome.storage.local.set({ [HEADER_RULES_KEY]: headers });
}

async function render(container) {
  const headers = await getHeaders();
  container.innerHTML = "";

  const list = document.createElement("div");
  list.className = "header-list";

  headers.forEach((header, index) => {
    const row = document.createElement("div");
    row.className = "header-row";

    // Toggle
    const toggle = document.createElement("label");
    toggle.className = "toggle";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = header.enabled;
    checkbox.addEventListener("change", async () => {
      const h = await getHeaders();
      h[index].enabled = checkbox.checked;
      await saveHeaders(h);
    });
    const slider = document.createElement("span");
    slider.className = "slider";
    toggle.append(checkbox, slider);

    // Name input
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = header.name;
    nameInput.placeholder = "Header-Name";
    nameInput.style.flex = "1";
    nameInput.addEventListener("change", async () => {
      const h = await getHeaders();
      h[index].name = nameInput.value.trim();
      await saveHeaders(h);
    });

    // Value input
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.value = header.value;
    valueInput.placeholder = "value";
    valueInput.style.flex = "1";
    valueInput.addEventListener("change", async () => {
      const h = await getHeaders();
      h[index].value = valueInput.value;
      await saveHeaders(h);
    });

    // Delete button
    const del = document.createElement("button");
    del.className = "btn btn-sm btn-danger";
    del.textContent = "\u00D7";
    del.title = "Remove header";
    del.addEventListener("click", async () => {
      const h = await getHeaders();
      h.splice(index, 1);
      await saveHeaders(h);
      render(container);
    });

    row.append(toggle, nameInput, valueInput, del);
    list.append(row);
  });

  // Add-header button
  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-sm btn-ghost mt-6";
  addBtn.textContent = "+ Add header";
  addBtn.addEventListener("click", async () => {
    const h = await getHeaders();
    h.push({ name: "", value: "", enabled: true });
    await saveHeaders(h);
    render(container);
  });

  container.append(list, addBtn);
}
