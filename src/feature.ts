/**
 * One enhancement. GitHub swaps page content without full reloads and streams
 * parts of a page in late, so the host calls `apply` after every batch of DOM
 * changes. `apply` must be idempotent and write to the DOM only when something
 * differs, or it would wake itself up forever.
 */
export interface Feature {
  readonly id: string;
  readonly apply: (doc: Document) => void;
}
