import { readFile } from "node:fs/promises";

// Git checkout line endings vary by host. Build the approved test bytes
// explicitly so the production guard can compare raw input bytes.
export async function approvedBytes(type, id) {
  const path = new URL(`../testdata/${type}/${id}.json`, import.meta.url);
  const lf = (await readFile(path, "utf8")).replaceAll("\r\n", "\n");
  return type === "harmony" ? lf.replaceAll("\n", "\r\n") : lf;
}
