import type { Feature } from "../../feature.ts";
import { diffFiles, pullFilesRepo, treeFilePath, treeFiles } from "../../github/pull-files.ts";
import { buttonGroup, toolbarButton, toolbarSlot } from "../../github/toolbar.ts";
import { readSetting, writeSetting } from "../../storage.ts";
import {
  DEFAULT_GENERATED_PATTERNS,
  DEFAULT_TEST_PATTERNS,
  FILE_KINDS,
  type FileKind,
  makeClassifier,
} from "./classify.ts";

// Pull request "Files changed" filter. Test files: show all, hide them, or show
// only them. Generated files: show or hide. Both choices are remembered per
// repository.

// #region Settings

const TEST_MODES = ["all", "hide-tests", "only-tests"] as const;
type TestMode = (typeof TEST_MODES)[number];

const TEST_MODE_LABELS: Record<TestMode, string> = {
  all: "All",
  "hide-tests": "Hide tests",
  "only-tests": "Tests only",
};

interface Settings {
  readonly tests: TestMode;
  readonly hideGenerated: boolean;
}

const DEFAULT_SETTINGS: Settings = { tests: "all", hideGenerated: false };

const isTestMode = (value: unknown): value is TestMode => TEST_MODES.some((mode) => mode === value);

// Stored values come back as unknown; anything malformed falls back to the
// defaults field by field.
const decodeSettings = (stored: unknown): Settings => {
  if (typeof stored !== "object" || stored === null) return DEFAULT_SETTINGS;
  const tests = "tests" in stored ? stored.tests : undefined;
  const hideGenerated = "hideGenerated" in stored ? stored.hideGenerated : undefined;
  return {
    tests: isTestMode(tests) ? tests : DEFAULT_SETTINGS.tests,
    hideGenerated:
      typeof hideGenerated === "boolean" ? hideGenerated : DEFAULT_SETTINGS.hideGenerated,
  };
};

const storageKey = (repo: string) => `file-filter:${repo}`;

const hiddenKinds = (settings: Settings): ReadonlySet<FileKind> => {
  const hidden = new Set<FileKind>();
  if (settings.tests === "hide-tests") hidden.add("test");
  if (settings.tests === "only-tests") {
    hidden.add("code");
    hidden.add("generated");
  }
  if (settings.hideGenerated) hidden.add("generated");
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
  onGenerated: () => void,
) => {
  const stats = doc.createElement("span");
  stats.className = "ghe-stats text-small color-fg-muted mr-2 hide-sm";

  const testButtons = TEST_MODES.map((mode) => {
    const button = toolbarButton(doc, TEST_MODE_LABELS[mode], () => onTests(mode));
    button.dataset.testMode = mode;
    return button;
  });

  const generated = toolbarButton(doc, "Hide generated", onGenerated);
  generated.classList.add("ml-2");
  generated.dataset.generated = "";

  slot.append(stats, buttonGroup(doc, "Filter test files", testButtons), generated);
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
  generated: "Generated",
};

const formatTotals = (kind: FileKind, files: number, lines: Lines) =>
  `${KIND_LABELS[kind]} ${files.toLocaleString()} · +${lines.additions.toLocaleString()} −${lines.deletions.toLocaleString()}`;

// #endregion

// #region Feature

const classify = makeClassifier({
  generated: DEFAULT_GENERATED_PATTERNS,
  test: DEFAULT_TEST_PATTERNS,
});

const isFileKind = (value: string | null): value is FileKind =>
  FILE_KINDS.some((kind) => kind === value);

const createFileFilter = (): Feature => {
  const settingsByRepo = new Map<string, Settings>();
  const loading = new Set<string>();

  const update = (doc: Document, repo: string, change: Partial<Settings>) => {
    const next = { ...(settingsByRepo.get(repo) ?? DEFAULT_SETTINGS), ...change };
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
    // classified files.
    // Line counts come from the diffs GitHub has rendered so far. File counts
    // come from the tree, which lists every file even before its diff loads.
    const lines: Record<FileKind, Lines> = {
      code: { additions: 0, deletions: 0 },
      test: { additions: 0, deletions: 0 },
      generated: { additions: 0, deletions: 0 },
    };
    const diffs = diffFiles(doc);
    for (const file of diffs) {
      const kind = classify(file.path);
      setAttr(file.element, KIND_ATTR, kind);
      lines[kind].additions += file.additions;
      lines[kind].deletions += file.deletions;
    }
    const counts: Record<FileKind, number> = { code: 0, test: 0, generated: 0 };
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
        (tests) => update(doc, repo, { tests }),
        () =>
          update(doc, repo, {
            hideGenerated: !(settingsByRepo.get(repo) ?? DEFAULT_SETTINGS).hideGenerated,
          }),
      );
    }

    const totalFiles = counts.code + counts.test + counts.generated;
    const partial =
      diffs.length < totalFiles
        ? ` (lines from ${diffs.length.toLocaleString()} of ${totalFiles.toLocaleString()} files loaded)`
        : "";
    const shown = FILE_KINDS.filter((kind) => kind !== "generated" || counts.generated > 0);
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
    const generated = slot.querySelector("[data-generated]");
    if (generated) setAttr(generated, "aria-pressed", String(settings.hideGenerated));
  };

  return { id: "file-filter", apply };
};

export const fileFilter = createFileFilter();

// #endregion
