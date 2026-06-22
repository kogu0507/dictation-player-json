import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { resolve } from "node:path";
import {
  createFtpRelease,
  MANIFEST_NAME,
} from "./release-ftp-lib.mjs";

const sourceJson = process.env.DICTATION_CONTENT_SAMPLE1?.trim()
  ? resolve(process.env.DICTATION_CONTENT_SAMPLE1)
  : resolve(
      homedir(),
      "OneDrive",
      "ドキュメント",
      "dictation-content",
      "dist",
      "melody",
      "sample1.json",
    );

await runProductionBuild();

const releaseRoot = resolve("release/ftp-root");
const result = await createFtpRelease({
  distDir: resolve("dist"),
  sourceJson,
  releaseRoot,
});

console.log("FTP release package created:");
for (const path of result.files) {
  console.log(`- ${path}`);
}
console.log(`source sample1 SHA-256: ${result.sourceJsonHash}`);
console.log(`release sample1 SHA-256: ${result.releasedJsonHash}`);
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
