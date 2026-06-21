import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

if (!process.env.VITE_DATA_BASE_URL?.trim()) {
  process.env.VITE_DATA_BASE_URL = "./data/dictation/melody";
}

const { build } = await import("vite");
await build({ mode: "lan" });

const source = resolve("testdata/melody/sample1.json");
const destination = resolve("dist/data/dictation/melody/sample1.json");
await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);

const [sourceHash, destinationHash] = await Promise.all([
  sha256(source),
  sha256(destination),
]);
if (sourceHash !== destinationHash) {
  throw new Error("LAN確認用sample1.jsonのSHA-256が一致しません。");
}

console.log(`LAN data URL: ${process.env.VITE_DATA_BASE_URL}`);
console.log(`sample1 SHA-256: ${destinationHash}`);

async function sha256(path) {
  const content = await readFile(path);
  return createHash("sha256").update(content).digest("hex").toUpperCase();
}
