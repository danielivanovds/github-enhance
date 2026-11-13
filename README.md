# GitHub Enhance

A browser extension for Chrome and Safari that adds small features to GitHub.

The pull request features work on both of GitHub's "Files changed" pages: the
newer one at `/pull/N/changes` that signed-in users get, and the classic one
at `/pull/N/files`.

## Features

### File filter

On a pull request's **Files changed** tab, the toolbar gains these buttons:

- **All**: GitHub's default view.
- **Hide tests**: hides test files from the diff and the file tree.
- **Tests only**: shows only test files.
- **Hide docs**: hides Markdown and MDX files.
- **Hide generated**: hides lock files, build output, source maps and code
  generators' output.

The two Hide buttons work alongside the test buttons.

It also splits the totals by kind, for example
`Code 11 · +2,748 −16   Tests 22 · +1,896 −0   Docs 2 · +38 −1   Generated 7 · +458 −0`. File
counts come from the file tree, which lists every file. Line counts come from
the diffs GitHub has loaded so far, and the toolbar says so while some diffs
have not loaded yet.

The extension remembers the choices per repository.

The patterns in
[`src/features/file-filter/classify.ts`](src/features/file-filter/classify.ts)
decide each file's kind. Test patterns cover JS/TS, Go, Python, Rust, the JVM
languages, Swift and C#, plus fixtures, mocks and snapshots. The first match
wins, in the order generated, test, docs: a lock file in a test fixture counts
as generated, and a Markdown fixture counts as a test.

### Collapse all / expand all

Two toolbar buttons fold or unfold every diff on the page. They skip files
the filter has hidden.

## Install

You need [Bun](https://bun.sh). Safari also needs Xcode.

```bash
gh repo clone danielivanovds/github-enhance
cd github-enhance
bun install
bun run build    # writes the extension to dist/
```

### Chrome, Arc, Edge and other Chromium browsers

1. Open `chrome://extensions` (Arc: **Extensions → Manage extensions**) and
   turn on **Developer mode**.
2. Click **Load unpacked** and pick the `dist/` folder.
3. Open a pull request's **Files changed** tab and reload it once.

To update: `git pull`, `bun run build`, then click the reload icon on the
extension's card and reload the GitHub tab.

### Safari (macOS)

Safari loads extensions only from inside a Mac app. The Xcode project in
`safari/` is that app; it uses the files in `dist/` as they are, so one
command rebuilds everything:

```bash
bun run safari
```

This builds `dist/`, builds the app into `safari/build/`, registers the
extension with macOS and starts the app. Then, in Safari:

1. **Settings → Advanced**: turn on **Show features for web developers**
   (once).
2. **Settings → Developer**: turn on **Allow unsigned extensions**.
3. **Settings → Extensions**: tick **GitHub Enhance**, then allow it on
   github.com.
4. Reload the pull request page.

The app is signed ad hoc, without an Apple Developer account, and Safari turns
unsigned extensions off each time it quits. After a Safari restart, repeat
steps 2 and 3; if the extension is missing from the list, run
`bun run safari` again.

To update: `git pull`, `bun run safari`, then reload the GitHub tab.

**Collapse all** needs Safari 17.4 or later; the rest needs 15.4 or later.

## Develop

```bash
bun run check   # lint, typecheck, test, build
```

## Add a feature

Each feature implements `Feature` from [`src/feature.ts`](src/feature.ts) and
is listed in [`src/content.ts`](src/content.ts). GitHub replaces page content
without full reloads and loads parts of a page late, so the host calls every
feature's `apply` after each batch of DOM changes. `apply` must be idempotent,
and it may write to the DOM only when a value differs.

Features read the page through the `PullFilesPage` contract in
[`src/github/page.ts`](src/github/page.ts). Its two implementations,
`classic-page.ts` and `changes-page.ts`, hold every GitHub selector, so a
markup change has one place to fix. The newer page's class names carry build
hashes, so `changes-page.ts` relies on test ids, roles, ids and icon classes
only.
