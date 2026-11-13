import { changesPage } from "./changes-page.ts";
import { classicPage } from "./classic-page.ts";
import type { PullFilesPage } from "./page.ts";

// Picks which of GitHub's two "Files changed" pages is showing. All selectors
// live in the two page modules, so a markup change has one place to fix.

const PAGES = [changesPage, classicPage];

/** Returns "owner/repo" when the URL is a pull request's files view. */
export const pullFilesRepo = (url: URL): string | undefined => {
  const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/pull\/\d+\/(?:files|changes)\b/);
  return match ? `${match[1]}/${match[2]}` : undefined;
};

/** Which of the two pages is showing; undefined while it is still loading. */
export const pullFilesPage = (doc: Document): PullFilesPage | undefined =>
  PAGES.find((page) => page.matches(doc));

/** Matches directory entries in either page's tree. */
export const treeDirectorySelector = PAGES.map((page) => page.treeDirectory).join(", ");
