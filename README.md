# GitHub Enhance

A browser extension for Chrome and Safari that adds small features to GitHub.

## Features

### File filter

On a pull request's **Files changed** tab, the toolbar gains these buttons:

- **All**: GitHub's default view.
- **Hide tests**: hides test files from the diff and the file tree.
- **Tests only**: shows only test files.
- **Hide generated**: hides lock files, build output, source maps and code
  generators' output. It works alongside the test buttons.

It also splits the totals into code, tests and generated files, for example
`Code 13 · +2,786 −17   Tests 22 · +1,896 −0   Generated 7 · +458 −0`. File
counts come from the file tree, which lists every file. Line counts come from
the diffs GitHub has loaded so far, and the toolbar says so while some diffs
have not loaded yet.

The extension remembers the choices per repository.

The patterns in
[`src/features/file-filter/classify.ts`](src/features/file-filter/classify.ts)
decide what counts as a test or as generated. Test patterns cover JS/TS, Go,
Python, Rust, the JVM languages, Swift and C#, plus fixtures, mocks and
snapshots. When a file matches both, generated wins, so a lock file in a test
fixture counts as generated.

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

Keep GitHub selectors in `src/github/`, so a markup change has one place to fix.
