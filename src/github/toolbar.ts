import type { PullFilesPage } from "./page.ts";

const HOST_ID = "ghe-toolbar";

// Keeps each button group on one line when GitHub's toolbar runs short of
// width; the slots wrap as whole groups instead.
const STYLE = `
#${HOST_ID} { flex: 0 1 auto; min-width: 0; justify-content: flex-end; gap: 4px 0; }
#${HOST_ID} > * { flex-wrap: wrap; justify-content: flex-end; gap: 4px; }
#${HOST_ID} .ghe-stats { white-space: nowrap; }
#${HOST_ID} .BtnGroup { display: inline-flex; flex-wrap: nowrap; }
#${HOST_ID} .btn { white-space: nowrap; }
#${HOST_ID} .btn[aria-pressed="true"] {
  background-color: var(--button-default-bgColor-active, var(--color-btn-active-bg));
  font-weight: 600;
}
`;

const ensureStyle = (doc: Document) => {
  if (doc.getElementById(`${HOST_ID}-style`)) return;
  const style = doc.createElement("style");
  style.id = `${HOST_ID}-style`;
  style.textContent = STYLE;
  doc.head.append(style);
};

/**
 * A feature's own spot in the pull request diff toolbar, created on first use.
 * `order` sets its place among the other features' spots, whichever feature
 * runs first. Returns undefined until GitHub has rendered the toolbar.
 */
export const toolbarSlot = (
  doc: Document,
  page: PullFilesPage,
  id: string,
  order: number,
): HTMLElement | undefined => {
  const existing = doc.getElementById(id);
  if (existing) return existing;

  let host = doc.getElementById(HOST_ID);
  if (!host) {
    host = doc.createElement("div");
    host.id = HOST_ID;
    host.className = "d-inline-flex flex-items-center flex-wrap";
    if (!page.mountToolbar(doc, host)) return undefined;
    ensureStyle(doc);
  }

  const slot = doc.createElement("div");
  slot.id = id;
  slot.className = "d-inline-flex flex-items-center mr-2";
  slot.style.order = String(order);
  host.append(slot);
  return slot;
};

/** A Primer small button, as GitHub draws them in this toolbar. */
export const toolbarButton = (doc: Document, text: string, onClick: () => void) => {
  const button = doc.createElement("button");
  button.type = "button";
  button.className = "btn btn-sm";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
};

/** Primer buttons joined into one group. */
export const buttonGroup = (doc: Document, label: string, buttons: readonly HTMLElement[]) => {
  const group = doc.createElement("div");
  group.className = "BtnGroup";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  for (const button of buttons) {
    button.classList.add("BtnGroup-item");
    group.append(button);
  }
  return group;
};
