// Builds the extension, wraps it in the macOS app under safari/, registers the
// extension with macOS and starts the app. Safari lists the extension once the
// app has run. The app is signed ad hoc, so Safari loads it only while
// "Allow unsigned extensions" is on.

import { $ } from "bun";

const project = "safari/GitHub Enhance/GitHub Enhance.xcodeproj";
const derivedData = "safari/build";
const app = `${derivedData}/Build/Products/Debug/GitHub Enhance.app`;

await $`bun run build`;

await $`xcodebuild -quiet -project ${project} -scheme ${"GitHub Enhance"} -configuration Debug -derivedDataPath ${derivedData} CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build`;

// A running copy keeps serving the old build, so quit it first.
await $`osascript -e ${'quit app "GitHub Enhance"'}`.nothrow().quiet();
await $`pluginkit -a ${`${app}/Contents/PlugIns/GitHub Enhance Extension.appex`}`;
await $`open ${app}`;

console.log(`Started ${app}. Turn the extension on in Safari → Settings → Extensions.`);
