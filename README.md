# GitHub Enhance

A browser extension for Chrome and Safari that adds small features to GitHub.

## Features

### Test-file filter

On a pull request's **Files changed** tab, the toolbar gains three buttons:

- **All**: GitHub's default view.
- **Hide tests**: hides test files from the diff and the file tree.
- **Tests only**: shows only test files.

It also splits the totals into code and tests, for example
`Code 281 · +13,113 −3,235   Tests 2,598 · +12,377 −647`. File counts come from
the file tree, which lists every file. Line counts come from the diffs GitHub
has loaded so far, and the toolbar says so while some diffs have not loaded yet.

The extension remembers the choice per repository.

The patterns in
[`src/features/test-filter/classify.ts`](src/features/test-filter/classify.ts)
decide what counts as a test. They cover JS/TS, Go, Python, Rust, the JVM
languages, Swift and C#, plus fixtures, mocks and snapshots.

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
