import type { Feature } from "../../feature.ts";
import {
  diffFiles,
  pullFilesRepo,
  reviewTools,
  treeFilePath,
  treeFiles,
} from "../../github/pull-files.ts";
import { readSetting, writeSetting } from "../../storage.ts";
import { DEFAULT_TEST_PATTERNS, type FileKind, makeClassifier } from "./classify.ts";

// Pull request "Files changed" filter: show all files, hide test files, or show
// only test files. The choice is remembered per repository.

// #region Mode

const MODES = ["all", "hide-tests", "only-tests"] as const;
type Mode = (typeof MODES)[number];

const MODE_LABELS: Record<Mode, string> = {
  all: "All",
  "hide-tests": "Hide tests",
  "only-tests": "Tests only",
};

const isMode = (value: unknown): value is Mode => MODES.some((mode) => mode === value);

const storageKey = (repo: string) => `test-filter:${repo}`;

// #endregion

// #region DOM

const ROOT_ATTR = "data-ghe-test-filter";
const KIND_ATTR = "data-ghe-kind";
const CONTROL_ID = "ghe-test-filter";

// Hiding is pure CSS keyed on attributes, so files that GitHub re-renders or
// streams in later pick up the current mode without a script pass. A directory
// in the tree hides once none of its files would show.
const STYLE = `
html[${ROOT_ATTR}="hide-tests"] [${KIND_ATTR}="test"],
html[${ROOT_ATTR}="only-tests"] [${KIND_ATTR}="code"],
html[${ROOT_ATTR}="hide-tests"] file-tree li[data-tree-entry-type="directory"]:not(:has(li[${KIND_ATTR}="code"])),
html[${ROOT_ATTR}="only-tests"] file-tree li[data-tree-entry-type="directory"]:not(:has(li[${KIND_ATTR}="test"])) {
  display: none !important;
}
#${CONTROL_ID} .btn[aria-pressed="true"] {
  background-color: var(--button-default-bgColor-active, var(--color-btn-active-bg));
  font-weight: 600;
}
`;

const ensureStyle = (doc: Document) => {
  if (doc.getElementById(`${CONTROL_ID}-style`)) return;
  const style = doc.createElement("style");
  style.id = `${CONTROL_ID}-style`;
  style.textContent = STYLE;
  doc.head.append(style);
};

const setAttr = (element: Element, name: string, value: string) => {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
};

const setText = (element: Element, text: string) => {
  if (element.textContent !== text) element.textContent = text;
};

const buildControl = (doc: Document, onSelect: (mode: Mode) => void): HTMLElement => {
  const control = doc.createElement("div");
  control.id = CONTROL_ID;
  control.className = "d-inline-flex flex-items-center mr-2";

  const stats = doc.createElement("span");
  stats.className = "ghe-stats text-small color-fg-muted mr-2 hide-sm";
  control.append(stats);

  const group = doc.createElement("div");
  group.className = "BtnGroup";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "Filter test files");
  for (const mode of MODES) {
    const button = doc.createElement("button");
    button.type = "button";
    button.className = "btn btn-sm BtnGroup-item";
    button.dataset.mode = mode;
    button.textContent = MODE_LABELS[mode];
    button.addEventListener("click", () => onSelect(mode));
    group.append(button);
  }
  control.append(group);
  return control;
};

// #endregion

// #region Stats

interface Lines {
  additions: number;
  deletions: number;
}

const formatTotals = (name: string, files: number, lines: Lines) =>
  `${name} ${files.toLocaleString()} · +${lines.additions.toLocaleString()} −${lines.deletions.toLocaleString()}`;

// #endregion

// #region Feature

const classify = makeClassifier(DEFAULT_TEST_PATTERNS);

const createTestFilter = (): Feature => {
  const modes = new Map<string, Mode>();
  const loading = new Set<string>();

  const select = (doc: Document, repo: string, mode: Mode) => {
    modes.set(repo, mode);
    void writeSetting(storageKey(repo), mode);
    apply(doc);
  };

  const apply = (doc: Document) => {
    const root = doc.documentElement;
    const repo = pullFilesRepo(new URL(doc.location.href));
    if (!repo) {
      root.removeAttribute(ROOT_ATTR);
      return;
    }

    const mode = modes.get(repo);
    if (!mode) {
      if (!loading.has(repo)) {
        loading.add(repo);
        void readSetting(storageKey(repo)).then((stored) => {
          loading.delete(repo);
          modes.set(repo, isMode(stored) ? stored : "all");
          apply(doc);
        });
      }
      return;
    }

    ensureStyle(doc);
    setAttr(root, ROOT_ATTR, mode);

    // Line counts come from the diffs GitHub has rendered so far. File counts
    // come from the tree, which lists every file even before its diff loads.
    const lines: Record<FileKind, Lines> = {
      code: { additions: 0, deletions: 0 },
      test: { additions: 0, deletions: 0 },
    };
    const diffs = diffFiles(doc);
    for (const file of diffs) {
      const kind = classify(file.path);
      setAttr(file.element, KIND_ATTR, kind);
      lines[kind].additions += file.additions;
      lines[kind].deletions += file.deletions;
    }
    const counts: Record<FileKind, number> = { code: 0, test: 0 };
    const tree = treeFiles(doc);
    for (const entry of tree) {
      // A tree entry's path never changes, so classify it once.
      const known = entry.getAttribute(KIND_ATTR);
      const kind: FileKind =
        known === "test" || known === "code" ? known : classify(treeFilePath(entry));
      setAttr(entry, KIND_ATTR, kind);
      counts[kind] += 1;
    }
    if (tree.length === 0) {
      for (const file of diffs) counts[classify(file.path)] += 1;
    }
    const totalFiles = counts.code + counts.test;
    const partial =
      diffs.length < totalFiles
        ? ` (lines from ${diffs.length.toLocaleString()} of ${totalFiles.toLocaleString()} files loaded)`
        : "";

    const tools = reviewTools(doc);
    if (!tools) return;
    let control = doc.getElementById(CONTROL_ID);
    if (!control) {
      control = buildControl(doc, (next) => select(doc, repo, next));
      tools.prepend(control);
    }
    const stats = control.querySelector(".ghe-stats");
    if (stats) {
      setText(
        stats,
        `${formatTotals("Code", counts.code, lines.code)}   ${formatTotals("Tests", counts.test, lines.test)}${partial}`,
      );
    }
    for (const button of control.querySelectorAll<HTMLButtonElement>("button[data-mode]")) {
      setAttr(button, "aria-pressed", String(button.dataset.mode === mode));
    }
  };

  return { id: "test-filter", apply };
};

export const testFilter = createTestFilter();

// #endregion
