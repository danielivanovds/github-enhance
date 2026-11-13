// Bundles the content script and copies the manifest into dist/, which is the
// folder to load as an unpacked extension (Chrome) or to convert for Safari.

import { cp, rm } from "node:fs/promises";

const outdir = "dist";

await rm(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: ["src/content.ts"],
  outdir,
  target: "browser",
  format: "iife",
  minify: false,
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await cp("manifest.json", `${outdir}/manifest.json`);
await cp("icons", `${outdir}/icons`, {
  recursive: true,
  filter: (path) => !path.endsWith(".svg"),
});

console.log(`Built ${result.outputs.length} file(s) into ${outdir}/`);
