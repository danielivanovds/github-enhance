import type { Feature } from "./feature.ts";
import { testFilter } from "./features/test-filter/index.ts";

const features: readonly Feature[] = [testFilter];

const applyAll = () => {
  for (const feature of features) {
    try {
      feature.apply(document);
    } catch (error) {
      // One broken feature must not take the others down with it.
      console.error(`[github-enhance] ${feature.id} failed`, error);
    }
  }
};

// Coalesce bursts of mutations into one pass per frame.
let scheduled = false;
const schedule = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyAll();
  });
};

new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
applyAll();
