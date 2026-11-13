import { reviewTools } from "./pull-files.ts";

const HOST_ID = "ghe-toolbar";

/**
 * A feature's own spot in the pull request diff toolbar, created on first use.
 * `order` sets its place among the other features' spots, whichever feature
 * runs first. Returns undefined until GitHub has rendered the toolbar.
 */
export const toolbarSlot = (doc: Document, id: string, order: number): HTMLElement | undefined => {
  const existing = doc.getElementById(id);
  if (existing) return existing;

  const tools = reviewTools(doc);
  if (!tools) return undefined;

  let host = doc.getElementById(HOST_ID);
  if (!host) {
    host = doc.createElement("div");
    host.id = HOST_ID;
    host.className = "d-inline-flex flex-items-center flex-wrap";
    tools.prepend(host);
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
