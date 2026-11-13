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

## Develop

```bash
bun install
bun run check   # lint, typecheck, test, build
```

`bun run build` writes the extension to `dist/`.

### Load in Chrome

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick the `dist/` folder.
3. After each rebuild, click the reload icon on the extension's card.

### Load in Safari

1. Run `bun run build`.
2. Run `xcrun safari-web-extension-converter dist --app-name "GitHub Enhance" --macos-only`.
3. Build and run the generated Xcode project.
4. In Safari, open **Settings → Advanced** and turn on **Show features for web
   developers**. Then open **Settings → Developer** and turn on **Allow
   unsigned extensions**.
5. Turn on the extension under **Settings → Extensions**.

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
