// Renders icons/icon.svg into every PNG the extension and the Safari app use.
// Run it after changing the SVG and commit the output. Needs rsvg-convert
// (`brew install librsvg`).

import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { $ } from "bun";

const source = "icons/icon.svg";

// Browsers pick the closest size for the toolbar, menus and the extensions page.
const EXTENSION_SIZES = [16, 32, 48, 96, 128, 256, 512];

// macOS app icons leave a margin round the artwork: 824 of 1024 points.
const APP_CANVAS = 1024;
const APP_ARTWORK = 824;

const APP_DIR = "safari/GitHub Enhance/GitHub Enhance";
const APP_ICON_SET = `${APP_DIR}/Assets.xcassets/AppIcon.appiconset`;
const APP_ICON_POINTS = [16, 32, 128, 256, 512];

const render = (svg: string, size: number, out: string) =>
  $`rsvg-convert -w ${size} -h ${size} -o ${out} < ${new Response(svg)}`;

const svg = await readFile(source, "utf8");

const offset = (APP_CANVAS - APP_ARTWORK) / 2;
const appSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${APP_CANVAS} ${APP_CANVAS}">${svg.replace(
  "<svg ",
  `<svg x="${offset}" y="${offset}" width="${APP_ARTWORK}" height="${APP_ARTWORK}" `,
)}</svg>`;

await mkdir("icons", { recursive: true });
for (const size of EXTENSION_SIZES) await render(svg, size, `icons/icon-${size}.png`);

// Safari's converter fills this set with unpadded copies of the extension
// icon; replace them.
for (const file of await readdir(APP_ICON_SET)) {
  if (file.endsWith(".png")) await rm(`${APP_ICON_SET}/${file}`);
}
const images = [];
for (const points of APP_ICON_POINTS) {
  for (const scale of [1, 2]) {
    const filename = `icon_${points}x${points}${scale === 2 ? "@2x" : ""}.png`;
    await render(appSvg, points * scale, `${APP_ICON_SET}/${filename}`);
    images.push({ filename, idiom: "mac", scale: `${scale}x`, size: `${points}x${points}` });
  }
}
await writeFile(
  `${APP_ICON_SET}/Contents.json`,
  `${JSON.stringify({ images, info: { author: "xcode", version: 1 } }, null, 2)}\n`,
);

// The app's window shows this one at 128 points, so render it for 3x screens.
await render(appSvg, 384, `${APP_DIR}/Resources/Icon.png`);

console.log(`Rendered ${source}`);
