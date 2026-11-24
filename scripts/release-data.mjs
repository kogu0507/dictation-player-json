import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { createDataOnlyRelease } from "./release-data-lib.mjs";
import { resolveReleaseSource } from "./release-inputs.mjs";
import { MANIFEST_NAME } from "./release-ftp-lib.mjs";

const { values: { id, type, "dry-run": dryRun } } = parseArgs({
  options: {
    id: { type: "string" },
    type: { type: "string", default: "melody" },
    "dry-run": { type: "boolean", default: false },
  },
});
const sourceJson = resolveReleaseSource({ type, id, dataOnly: true });
const releaseRoot = resolve("release/ftp-root");
const result = await createDataOnlyRelease({ sourceJson, type, id, releaseRoot, dryRun });

if (dryRun) {
  console.log(`入力: ${result.sourcePath}`);
  console.log(`承認済みSHA-256と一致: ${result.sourceHash}`);
  console.log(`出力予定: ${releaseRoot}`);
  for (const file of result.files) console.log(`- ${file}`);
} else {
  console.log("Data-only FTP release package created:");
  console.log(`- ${result.releasePath}`);
  console.log(`source SHA-256: ${result.sourceHash}`);
  console.log(`${result.releasePath} release SHA-256: ${result.releasedHash}`);
  console.log(`manifest: ${resolve(releaseRoot, MANIFEST_NAME)}`);
}
