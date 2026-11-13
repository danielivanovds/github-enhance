// What the features need from a pull request's "Files changed" page. GitHub
// serves two of them, and classic-page.ts and changes-page.ts each implement
// this contract with that page's selectors.

// #region Contract

export interface DiffFile {
  /** The element to hide or show for this file. */
  readonly element: HTMLElement;
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
}

/** The control that folds a diff away. Clicking it keeps GitHub's state in step. */
export interface DiffToggle {
  readonly button: HTMLElement;
  readonly expanded: boolean;
}

export interface PullFilesPage {
  readonly matches: (doc: Document) => boolean;
  /** The diffs rendered so far. Large pull requests load more as you scroll. */
  readonly diffFiles: (doc: Document) => DiffFile[];
  readonly diffToggle: (file: DiffFile) => DiffToggle | null | undefined;
  /** File entries in the sidebar tree, which lists every file, loaded or not. */
  readonly treeFiles: (doc: Document) => HTMLElement[];
  readonly treeFilePath: (entry: HTMLElement) => string;
  /** A selector matching the tree's directory entries. */
  readonly treeDirectory: string;
  /** Puts the extension's toolbar into GitHub's; false until GitHub has rendered it. */
  readonly mountToolbar: (doc: Document, host: HTMLElement) => boolean;
}

// #endregion

// #region Parsing

const STATS = /([\d,]+) additions? & ([\d,]+) deletions?/;

const toCount = (text: string | undefined): number => Number((text ?? "0").replaceAll(",", ""));

/**
 * Reads "N additions & M deletions" from a diff header's screen-reader text.
 * Binary and renamed-only files have none and count as zero.
 */
export const parseLineStats = (text: string | null | undefined) => {
  const match = text?.match(STATS);
  return { additions: toCount(match?.[1]), deletions: toCount(match?.[2]) };
};

// #endregion
