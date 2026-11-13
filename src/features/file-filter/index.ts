import type { Feature } from "../../feature.ts";
import { diffFiles, pullFilesRepo, treeFilePath, treeFiles } from "../../github/pull-files.ts";
import { buttonGroup, toolbarButton, toolbarSlot } from "../../github/toolbar.ts";
import { readSetting, writeSetting } from "../../storage.ts";
import {
  DEFAULT_DOCS_PATTERNS,
  DEFAULT_GENERATED_PATTERNS,
  DEFAULT_TEST_PATTERNS,
  FILE_KINDS,
  type FileKind,
  makeClassifier,
} from "./classify.ts";

// Pull request "Files changed" filter. Test files: show all, hide them, or show
// only them. Docs and generated files: show or hide each. The choices are
// remembered per repository.

// #region Settings

const TEST_MODES = ["all", "hide-tests", "only-tests"] as const;
type TestMode = (typeof TEST_MODES)[number];

const TEST_MODE_LABELS: Record<TestMode, string> = {
  all: "All",
  "hide-tests": "Hide tests",
  "only-tests": "Tests only",
};

/** Kinds that get their own on/off "Hide" button. */
const TOGGLE_KINDS = ["docs", "generated"] as const;
type ToggleKind = (typeof TOGGLE_KINDS)[number];

interface Settings {
  readonly tests: TestMode;
  readonly hide: Readonly<Record<ToggleKind, boolean>>;
}

const DEFAULT_SETTINGS: Settings = { tests: "all", hide: { docs: false, generated: false } };

const isTestMode = (value: unknown): value is TestMode => TEST_MODES.some((mode) => mode === value);

// Stored values come back as unknown; anything malformed falls back to the
// defaults field by field.
const decodeSettings = (stored: unknown): Settings => {
  if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
  const tests = "tests" in stored ? stored.tests : undefined;
  const hide = "hide" in stored && typeof stored.hide === "object" ? stored.hide : null;
  const docs = hide !== null && "docs" in hide ? hide.docs : undefined;
  const generated = hide !== null && "generated" in hide ? hide.generated : undefined;
  return {
    tests: isTestMode(tests) ? tests : DEFAULT_SETTINGS.tests,
    hide: {
      docs: typeof docs === "boolean" ? docs : DEFAULT_SETTINGS.hide.docs,
      generated: typeof generated === "boolean" ? generated : DEFAULT_SETTINGS.hide.generated,
    },
  };
};

const storageKey = (repo: string) => `file-filter:${repo}`;

const hiddenKinds = (settings: Settings): ReadonlySet<FileKind> => {
  const hidden = new Set<FileKind>(TOGGLE_KINDS.filter((kind) => settings.hide[kind]));
  if (settings.tests === "hide-tests") hidden.add("test");
  if (settings.tests === "only-tests") {
    for (const kind of FILE_KINDS) if (kind !== "test") hidden.add(kind);
  }
  return hidden;
};

// #endregion

// #region DOM

const KIND_ATTR = "data-ghe-kind";
const SLOT_ID = "ghe-file-filter";
const hideAttr = (kind: FileKind) => `data-ghe-hide-${kind}`;

// Hiding is pure CSS keyed on attributes, so files that GitHub re-renders or
// streams in later pick up the current settings without a script pass.
//
// A tree directory hides once none of its files would show: for every kind,
// either that kind is hidden or the directory holds no file of it.
const DIRECTORY = 'file-tree li[data-tree-entry-type="directory"]';
const STYLE = `
${FILE_KINDS.map((kind) => `html[${hideAttr(kind)}] [${KIND_ATTR}="${kind}"]`).join(",\n")},
html:is(${FILE_KINDS.map((kind) => `[${hideAttr(kind)}]`).join(", ")}) ${DIRECTORY}${FILE_KINDS.map(
  (kind) => `:is(html[${hideAttr(kind)}] *, :not(:has(li[${KIND_ATTR}="${kind}"])))`,
).join("")} {
  display: none !important;
}
#ghe-toolbar .btn[aria-pressed="true"] {
  background-color: var(--button-default-bgColor-active, var(--color-btn-active-bg));
  font-weight: 600;
}
`;

const ensureStyle = (doc: Document) => {
  if (doc.getElementById(`${SLOT_ID}-style`)) return;
  const style = doc.createElement("style");
  style.id = `${SLOT_ID}-style`;
  style.textContent = STYLE;
  doc.head.append(style);
};

const setAttr = (element: Element, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};

const toggleAttr = (element: Element, name: string, on: boolean) => {
  if (element.hasAttribute(name) !== on) element.toggleAttribute(name, on);
};

const setText = (element: Element, text: string) => {
  if (element.textContent !== text) element.textContent = text;
};

const fillControls = (
  doc: Document,
  slot: HTMLElement,
  onTests: (mode: TestMode) => void,
  onToggle: (kind: ToggleKind) => void,
) => {
  const stats = doc.createElement("span");
  stats.className = "ghe-stats text-small color-fg-muted mr-2 hide-sm";

  const testButtons = TEST_MODES.map((mode) => {
    const button = toolbarButton(doc, TEST_MODE_LABELS[mode], () => onTests(mode));
    button.dataset.testMode = mode;
    return button;
  });

  const toggles = TOGGLE_KINDS.map((kind) => {
    const button = toolbarButton(doc, `Hide ${KIND_LABELS[kind].toLowerCase()}`, () =>
      onToggle(kind),
    );
    button.dataset.hideKind = kind;
    return button;
  });

  slot.append(
    stats,
    buttonGroup(doc, "Filter test files", testButtons),
    buttonGroup(doc, "Hide kinds of files", toggles),
  );
  slot.lastElementChild?.classList.add("ml-2");
};

// #endregion

// #region Stats

interface Lines {
  additions: number;
  deletions: number;
}

const KIND_LABELS: Record<FileKind, string> = {
  code: "Code",
  test: "Tests",
  docs: "Docs",
  generated: "Generated",
};

const formatTotals = (kind: FileKind, files: number, lines: Lines) =>
  `${KIND_LABELS[kind]} ${files.toLocaleString()} · +${lines.additions.toLocaleString()} −${lines.deletions.toLocaleString()}`;

const byKind = <T>(make: () => T): Record<FileKind, T> => ({
  code: make(),
  test: make(),
  docs: make(),
  generated: make(),
});

// #endregion

// #region Feature

const classify = makeClassifier({
  generated: DEFAULT_GENERATED_PATTERNS,
  test: DEFAULT_TEST_PATTERNS,
  docs: DEFAULT_DOCS_PATTERNS,
});

const isFileKind = (value: string | null): value is FileKind =>
  FILE_KINDS.some((kind) => kind === value);

const createFileFilter = (): Feature => {
  const settingsByRepo = new Map<string, Settings>();
  const loading = new Set<string>();

  const current = (repo: string) => settingsByRepo.get(repo) ?? DEFAULT_SETTINGS;

  const update = (doc: Document, repo: string, next: Settings) => {
    settingsByRepo.set(repo, next);
    void writeSetting(storageKey(repo), next);
    apply(doc);
  };

  const apply = (doc: Document) => {
    const root = doc.documentElement;
    const repo = pullFilesRepo(new URL(doc.location.href));
    if (!repo) {
      for (const kind of FILE_KINDS) root.removeAttribute(hideAttr(kind));
      return;
    }

    const settings = settingsByRepo.get(repo);
    if (!settings) {
      if (!loading.has(repo)) {
        loading.add(repo);
        void readSetting(storageKey(repo)).then((stored) => {
          loading.delete(repo);
          settingsByRepo.set(repo, decodeSettings(stored));
          apply(doc);
        });
      }
      return;
    }

    // Classify before hiding anything, so no directory hides for lack of
    // classified files. Line counts come from the diffs GitHub has rendered so
    // far. File counts come from the tree, which lists every file even before
    // its diff loads.
    const lines = byKind<Lines>(() => ({ additions: 0, deletions: 0 }));
    const diffs = diffFiles(doc);
    for (const file of diffs) {
      const kind = classify(file.path);
      setAttr(file.element, KIND_ATTR, kind);
      lines[kind].additions += file.additions;
      lines[kind].deletions += file.deletions;
    }
    const counts = byKind(() => 0);
    const tree = treeFiles(doc);
    for (const entry of tree) {
      // A tree entry's path never changes, so classify it once.
      const known = entry.getAttribute(KIND_ATTR);
      const kind = isFileKind(known) ? known : classify(treeFilePath(entry));
      setAttr(entry, KIND_ATTR, kind);
      counts[kind] += 1;
    }
    if (tree.length === 0) {
      for (const file of diffs) counts[classify(file.path)] += 1;
    }

    ensureStyle(doc);
    const hidden = hiddenKinds(settings);
    for (const kind of FILE_KINDS) toggleAttr(root, hideAttr(kind), hidden.has(kind));

    const slot = toolbarSlot(doc, SLOT_ID, 1);
    if (!slot) return;
    if (!slot.hasChildNodes()) {
      fillControls(
        doc,
        slot,
        (tests) => update(doc, repo, { ...current(repo), tests }),
        (kind) => {
          const now = current(repo);
          update(doc, repo, { ...now, hide: { ...now.hide, [kind]: !now.hide[kind] } });
        },
      );
    }

    const totalFiles = FILE_KINDS.reduce((sum, kind) => sum + counts[kind], 0);
    const partial =
      diffs.length < totalFiles
        ? ` (lines from ${diffs.length.toLocaleString()} of ${totalFiles.toLocaleString()} files loaded)`
        : "";
    const shown = FILE_KINDS.filter((kind) => kind === "code" || counts[kind] > 0);
    const stats = slot.querySelector(".ghe-stats");
    if (stats) {
      setText(
        stats,
        `${shown.map((kind) => formatTotals(kind, counts[kind], lines[kind])).join("   ")}${partial}`,
      );
    }
    for (const button of slot.querySelectorAll<HTMLElement>("[data-test-mode]")) {
      setAttr(button, "aria-pressed", String(button.dataset.testMode === settings.tests));
    }
    for (const button of slot.querySelectorAll<HTMLElement>("[data-hide-kind]")) {
      const kind = TOGGLE_KINDS.find((k) => k === button.dataset.hideKind);
      if (kind) setAttr(button, "aria-pressed", String(settings.hide[kind]));
    }
  };

  return { id: "file-filter", apply };
};

export const fileFilter = createFileFilter();

// #endregion
