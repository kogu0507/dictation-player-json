import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  createFtpRelease,
  DATA_RELEASE_PATHS,
  MANIFEST_NAME,
} from "./release-ftp-lib.mjs";

const mode = resolveReleaseMode(process.argv.slice(2));
const dataFiles = resolveDataFiles(mode);

await runProductionBuild();

const releaseRoot = resolve("release/ftp-root");
const result = await createFtpRelease({
  distDir: resolve("dist"),
  dataFiles,
  releaseRoot,
  mode,
});

console.log("FTP release package created:");
for (const path of result.files) {
  console.log(`- ${path}`);
}
for (const jsonResult of result.jsonResults) {
  console.log(`${jsonResult.label} source SHA-256: ${jsonResult.sourceHash}`);
  console.log(
    `${jsonResult.releasePath} release SHA-256: ${jsonResult.releasedHash}`,
  );
}
console.log(`manifest: ${resolve(releaseRoot, MANIFEST_NAME)}`);

async function runProductionBuild() {
  const npmExecutable = process.env.npm_execpath;
  const command = npmExecutable ? process.execPath : "npm";
  const args = npmExecutable
    ? [npmExecutable, "run", "build"]
    : ["run", "build"];

  await new Promise((resolveBuild, rejectBuild) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
    });
    child.once("error", rejectBuild);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveBuild();
        return;
      }
      rejectBuild(
        new Error(
          `production buildに失敗しました (code=${code}, signal=${signal})`,
        ),
      );
    });
  });
}

function resolveDataFiles(mode) {
  const files = [{
    label: "melody sample1",
    releasePath: DATA_RELEASE_PATHS[0],
    sourcePath: resolveContentJson(
      "DICTATION_CONTENT_SAMPLE1",
      "melody",
      "sample1.json",
    ),
  }];

  if (mode === "full") {
    files.push({
      label: "harmony sample_harmony1",
      releasePath: DATA_RELEASE_PATHS[1],
      sourcePath: resolveContentJson(
        "DICTATION_CONTENT_HARMONY_SAMPLE1",
        "harmony",
        "sample_harmony1.json",
      ),
    });
  }

  return files;
}

function resolveReleaseMode(arguments_) {
  if (arguments_.length === 0) {
    return "full";
  }
  if (arguments_.length === 2 && arguments_[0] === "--mode") {
    if (arguments_[1] === "melody-only") {
      return "melody-only";
    }
    if (arguments_[1] === "full") {
      return "full";
    }
  }
  throw new Error(
    "利用方法: npm run release:ftp [-- --mode full|melody-only]",
  );
}

function resolveContentJson(environmentVariable, contentType, fileName) {
  const configured = process.env[environmentVariable]?.trim();
  if (configured) {
    return resolve(configured);
  }

  const candidates = [
    resolve(
      "..",
      "dictation-content",
      "dist",
      contentType,
      fileName,
    ),
    resolve(
      homedir(),
      "OneDrive",
      "ドキュメント",
      "dictation-content",
      "dist",
      contentType,
      fileName,
    ),
  ];
  return candidates.find((path) => existsSync(path)) ?? candidates[0];
}
