import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  buildMelodyDataReleasePath,
  createDataOnlyRelease,
} from "./release-data-lib.mjs";
import { MANIFEST_NAME } from "./release-ftp-lib.mjs";

const id = resolveId(process.argv.slice(2));
const sourceJson = resolveContentJson(id);
const releaseRoot = resolve("release/ftp-root");
const result = await createDataOnlyRelease({
  sourceJson,
  id,
  releaseRoot,
});

console.log("Data-only FTP release package created:");
console.log(`- ${buildMelodyDataReleasePath(id)}`);
console.log(`source SHA-256: ${result.sourceHash}`);
console.log(`${result.releasePath} release SHA-256: ${result.releasedHash}`);
console.log(`manifest: ${resolve(releaseRoot, MANIFEST_NAME)}`);

function resolveId(arguments_) {
  if (arguments_.length === 2 && arguments_[0] === "--id") {
    return arguments_[1];
  }
  throw new Error(
    "利用方法: npm run release:data -- --id <melody-id>",
  );
}

function resolveContentJson(id) {
  const configuredDirectory =
    process.env.DICTATION_CONTENT_MELODY_DIR?.trim();
  if (configuredDirectory) {
    return resolve(configuredDirectory, `${id}.json`);
  }

  const candidates = [
    resolve(
      "..",
      "dictation-content",
      "dist",
      "melody",
      `${id}.json`,
    ),
    resolve(
      homedir(),
      "OneDrive",
      "ドキュメント",
      "dictation-content",
      "dist",
      "melody",
      `${id}.json`,
    ),
  ];
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}
