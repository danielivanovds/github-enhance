// Reads GitHub's pull request "Files changed" page. Every selector the
// extension depends on lives here, so a GitHub markup change has one place to
// fix.

// #region Page

/** Returns "owner/repo" when the URL is a pull request's files view. */
export const pullFilesRepo = (url: URL): string | undefined => {
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/\d+\/files\b/);
  return match ? `${match[1]}/${match[2]}` : undefined;
};

/** The right-hand tool area of the sticky diff toolbar. */
export const reviewTools = (doc: Document): Element | null =>
  doc.querySelector(".pr-toolbar .pr-review-tools");

// #endregion

// #region Diff files

export interface DiffFile {
  readonly element: HTMLElement;
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
}

const STATS = /([\d,]+) additions? & ([\d,]+) deletions?/;

const toCount = (text: string | undefined): number => Number((text ?? "0").replaceAll(",", ""));

/** The diff blocks rendered so far. Large pull requests load more as you scroll. */
export const diffFiles = (doc: Document): DiffFile[] =>
  [...doc.querySelectorAll<HTMLElement>("div.file[data-tagsearch-path]")].map((element) => {
    // Binary and renamed-only files have no stats line; they count as zero.
    const stats = element.querySelector(".file-info .sr-only")?.textContent?.match(STATS);
    return {
      element,
      path: element.dataset.tagsearchPath ?? "",
      additions: toCount(stats?.[1]),
      deletions: toCount(stats?.[2]),
    };
  });

/**
 * The chevron in a diff's header that folds the diff away. Its aria-expanded
 * tells whether the diff is open. Clicking it, rather than toggling classes,
 * keeps GitHub's own state in step.
 */
export const diffToggle = (file: Element): HTMLElement | null =>
  file.querySelector<HTMLElement>(".file-header .js-details-target[aria-expanded]");

// #endregion

// #region File tree

/** File entries in the sidebar tree. The tree lists every file, loaded or not. */
export const treeFiles = (doc: Document): HTMLElement[] => [
  ...doc.querySelectorAll<HTMLElement>('file-tree li[data-tree-entry-type="file"]'),
];

const label = (item: Element): string =>
  item.querySelector(":scope > .ActionList-content .ActionList-item-label")?.textContent?.trim() ??
  "";

/**
 * The path of a tree entry. The tree carries no path attribute, so the path is
 * rebuilt from the labels of the enclosing directories (GitHub collapses
 * single-child directories into labels such as "docs/compiler").
 */
export const treeFilePath = (entry: Element): string => {
  const parts = [label(entry)];
  for (
    let dir = entry.parentElement?.closest('li[data-tree-entry-type="directory"]');
    dir;
    dir = dir.parentElement?.closest('li[data-tree-entry-type="directory"]')
  ) {
    parts.unshift(label(dir));
  }
  return parts.join("/");
};

// #endregion
