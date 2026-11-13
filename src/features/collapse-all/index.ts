import type { Feature } from "../../feature.ts";
import { diffFiles, diffToggle, pullFilesRepo } from "../../github/pull-files.ts";
import { buttonGroup, toolbarButton, toolbarSlot } from "../../github/toolbar.ts";

// Collapse or expand every diff on a pull request's "Files changed" tab at
// once. Files another feature has hidden are left alone, so expanding all does
// not render diffs nobody can see.

const SLOT_ID = "ghe-collapse-all";

const setExpanded = (doc: Document, expanded: boolean) => {
  for (const file of diffFiles(doc)) {
    if (!file.element.checkVisibility()) continue;
    const toggle = diffToggle(file.element);
    if (toggle && toggle.getAttribute("aria-expanded") !== String(expanded)) toggle.click();
  }
};

const apply = (doc: Document) => {
  if (!pullFilesRepo(new URL(doc.location.href))) return;
  const slot = toolbarSlot(doc, SLOT_ID, 2);
  if (!slot || slot.hasChildNodes()) return;
  slot.append(
    buttonGroup(doc, "Collapse or expand all files", [
      toolbarButton(doc, "Collapse all", () => setExpanded(doc, false)),
      toolbarButton(doc, "Expand all", () => setExpanded(doc, true)),
    ]),
  );
};

export const collapseAll: Feature = { id: "collapse-all", apply };
