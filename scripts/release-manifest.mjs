import { createHash } from "node:crypto";
import { readFile, readdir, lstat } from "node:fs/promises";
import { join } from "node:path";

export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export async function packageFiles(root, prefix = "") {
  const files = [];
  for (const entry of (await readdir(join(root, prefix), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    const stat = await lstat(join(root, path));
    if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new Error(`Invalid packaged file: ${path}`);
    if (stat.isDirectory()) files.push(...await packageFiles(root, path));
    else if (path !== "release-manifest.json") files.push({ path, sha256: sha256(await readFile(join(root, path))) });
  }
  return files;
}

export async function createReleaseManifest(root) {
  const json = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
  const plugin = await json(".codex-plugin/plugin.json");
  const compatibility = await json("contracts/compatibility.json");
  const core = await json("contracts/core-lock.json");
  return {
    schema_version: 1,
    plugin: { name: plugin.name, version: plugin.version, host: "codex" },
    server_contract: compatibility.server_contract,
    core,
    catalog_sha256: sha256(await readFile(join(root, "contracts/mcp-tool-catalog.json"))),
    files: await packageFiles(root),
  };
}
