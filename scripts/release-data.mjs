import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { createDataOnlyRelease } from "./release-data-lib.mjs";
import { resolveReleaseSource } from "./release-inputs.mjs";
import { MANIFEST_NAME } from "./release-ftp-lib.mjs";

const { values: { id, type } } = parseArgs({
  options: {
    id: { type: "string" },
    type: { type: "string", default: "melody" },
  },
});
const sourceJson = resolveReleaseSource({ type, id, dataOnly: true });
const releaseRoot = resolve("release/ftp-root");
const result = await createDataOnlyRelease({ sourceJson, type, id, releaseRoot });

console.log("Data-only FTP release package created:");
console.log(`- ${result.releasePath}`);
console.log(`source SHA-256: ${result.sourceHash}`);
console.log(`${result.releasePath} release SHA-256: ${result.releasedHash}`);
console.log(`manifest: ${resolve(releaseRoot, MANIFEST_NAME)}`);
