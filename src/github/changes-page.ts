import { type DiffFile, type PullFilesPage, parseLineStats } from "./page.ts";

// GitHub's newer "Files changed" page (/pull/N/changes): a React app that
// signed-in users get by default. Its class names carry build hashes, so only
// test ids, roles, ids and Primer icon classes are used here.

const LIST = '[data-testid="progressive-diffs-list"]';
const TREE_ITEM = '#pr-file-tree li[role="treeitem"]';
// File names are wrapped in left-to-right marks.
const LRM = /‎/g;

export const changesPage: PullFilesPage = {
  matches: (doc) => doc.querySelector('[data-testid="diff-content"]') !== null,

  diffFiles: (doc) =>
    [...doc.querySelectorAll<HTMLElement>(`${LIST} [role="region"][id^="diff-"]`)].flatMap(
      (region): DiffFile[] => {
        // Hide the list entry, not the region inside it, or the list's gap
        // stays behind for every hidden file.
        const element = region.closest<HTMLElement>(`${LIST} > *`);
        if (!element) return [];
        const header = region.querySelector("[data-diff-header-wrapper]");
        const stats = [...(header?.querySelectorAll(".sr-only") ?? [])].find((node) =>
          node.textContent?.startsWith("Lines changed"),
        );
        return [
          {
            element,
            path: region.querySelector("h3 code")?.textContent?.replace(LRM, "").trim() ?? "",
            ...parseLineStats(stats?.textContent),
          },
        ];
      },
    ),

  // The header's first button folds the diff; its chevron points down while
  // the diff is open.
  diffToggle: (file) => {
    const icon = file.element.querySelector(
      "[data-diff-header-wrapper] button > svg:is(.octicon-chevron-down, .octicon-chevron-right)",
    );
    const button = icon?.parentElement;
    return button && { button, expanded: icon.classList.contains("octicon-chevron-down") };
  },

  treeFiles: (doc) => [...doc.querySelectorAll<HTMLElement>(`${TREE_ITEM}:not([aria-expanded])`)],

  // Each tree entry's id is its full path.
  treeFilePath: (entry) => entry.id,

  treeDirectory: `${TREE_ITEM}[aria-expanded]`,

  // Between the commit picker on the left and the viewed-files counter on the
  // right of the sticky toolbar.
  mountToolbar: (doc, host) => {
    const toolbar = doc.querySelector('[data-testid="diff-content"] > section');
    const right = toolbar?.lastElementChild;
    if (!toolbar || !right) return false;
    toolbar.insertBefore(host, right);
    return true;
  },
};
