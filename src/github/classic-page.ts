import { type DiffFile, type PullFilesPage, parseLineStats } from "./page.ts";

// GitHub's classic "Files changed" page (/pull/N/files): server-rendered,
// with diffs streamed in as the reader scrolls. Signed-out visitors get it.

const DIRECTORY = 'li[data-tree-entry-type="directory"]';

const label = (item: Element): string =>
  item.querySelector(":scope > .ActionList-content .ActionList-item-label")?.textContent?.trim() ??
  "";

export const classicPage: PullFilesPage = {
  matches: (doc) => doc.querySelector(".pr-toolbar") !== null,

  diffFiles: (doc) =>
    [...doc.querySelectorAll<HTMLElement>("div.file[data-tagsearch-path]")].map(
      (element): DiffFile => ({
        element,
        path: element.dataset.tagsearchPath ?? "",
        ...parseLineStats(element.querySelector(".file-info .sr-only")?.textContent),
      }),
    ),

  diffToggle: (file) => {
    const button = file.element.querySelector<HTMLElement>(
      ".file-header .js-details-target[aria-expanded]",
    );
    return button && { button, expanded: button.getAttribute("aria-expanded") === "true" };
  },

  treeFiles: (doc) => [
    ...doc.querySelectorAll<HTMLElement>('file-tree li[data-tree-entry-type="file"]'),
  ],

  // The tree carries no path attribute, so the path is rebuilt from the labels
  // of the enclosing directories (GitHub collapses single-child directories
  // into labels such as "docs/compiler").
  treeFilePath: (entry) => {
    const parts = [label(entry)];
    for (
      let dir = entry.parentElement?.closest(DIRECTORY);
      dir;
      dir = dir.parentElement?.closest(DIRECTORY)
    ) {
      parts.unshift(label(dir));
    }
    return parts.join("/");
  },

  treeDirectory: `file-tree ${DIRECTORY}`,

  mountToolbar: (doc, host) => {
    const tools = doc.querySelector(".pr-toolbar .pr-review-tools");
    if (!tools) return false;
    tools.prepend(host);
    return true;
  },
};
