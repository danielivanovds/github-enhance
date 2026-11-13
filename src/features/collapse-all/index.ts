import type { Feature } from "../../feature.ts";
import type { PullFilesPage } from "../../github/page.ts";
import { pullFilesPage, pullFilesRepo } from "../../github/pull-files.ts";
import { buttonGroup, toolbarButton, toolbarSlot } from "../../github/toolbar.ts";

// Collapse or expand every diff on a pull request's "Files changed" tab at
// once. Files another feature has hidden are left alone, so expanding all does
// not render diffs nobody can see.

const SLOT_ID = "ghe-collapse-all";

const setExpanded = (doc: Document, page: PullFilesPage, expanded: boolean) => {
  for (const file of page.diffFiles(doc)) {
    if (!file.element.checkVisibility()) continue;
    const toggle = page.diffToggle(file);
    if (toggle && toggle.expanded !== expanded) toggle.button.click();
  }
};

const apply = (doc: Document) => {
  if (!pullFilesRepo(new URL(doc.location.href))) return;
  const page = pullFilesPage(doc);
  if (!page) return;
  const slot = toolbarSlot(doc, page, SLOT_ID, 2);
  if (!slot || slot.hasChildNodes()) return;
  slot.append(
    buttonGroup(doc, "Collapse or expand all files", [
      toolbarButton(doc, "Collapse all", () => setExpanded(doc, page, false)),
      toolbarButton(doc, "Expand all", () => setExpanded(doc, page, true)),
    ]),
  );
};

export const collapseAll: Feature = { id: "collapse-all", apply };
