import { lstat, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function verifyCore(root) {
  const coreRoot = resolve(root, "vendor/plugin-core");
  const lock = JSON.parse(await readFile(resolve(root, "contracts/core-lock.json"), "utf8"));
  const manifestBytes = await readFile(resolve(coreRoot, "contracts/core-manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  if (sha256(manifestBytes) !== lock.manifest_sha256) throw new Error("Core manifest digest mismatch");
  if (lock.version !== manifest.version || lock.name !== manifest.name) throw new Error("Core version mismatch");
  for (const [filePath, digest] of Object.entries(manifest.files)) {
    if (!/^(helpers|references|contracts)\/[\w./-]+$/.test(filePath) || filePath.split("/").includes("..")) throw new Error("Invalid core file path");
    const file = resolve(coreRoot, filePath);
    if (!(await lstat(file)).isFile()) throw new Error("Invalid core file path: " + filePath);
    if (sha256(await readFile(file)) !== digest) throw new Error("Core digest mismatch: " + filePath);
  }
  const catalog = await readFile(resolve(root, "contracts/mcp-tool-catalog.json"));
  if (sha256(catalog) !== manifest.files["contracts/mcp-tool-catalog.json"]) throw new Error("Tool catalog digest mismatch");
  return coreRoot;
}
