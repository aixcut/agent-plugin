#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packageFiles, sha256 } from "./release-manifest.mjs";
import { validateSkillClosure } from "./skill-contract-closure.mjs";

export async function verifyRelease(root) {
  const json = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
  const manifest = await json("release-manifest.json");
  if (manifest.schema_version !== 1 || !Array.isArray(manifest.files)) throw new Error("Invalid release manifest schema");
  for (const file of manifest.files) {
    if (typeof file.path !== "string" || file.path.startsWith("/") || file.path.split(/[\\/]/).some((part) => !part || part === "." || part === "..") || !/^[a-f0-9]{64}$/.test(file.sha256)) throw new Error("Invalid release file identity");
  }
  const actual = await packageFiles(root);
  if (JSON.stringify(actual) !== JSON.stringify(manifest.files)) throw new Error("Release file digest/inventory mismatch");
  const plugin = await json(".codex-plugin/plugin.json");
  const compatibility = await json("contracts/compatibility.json");
  const catalog = await json("contracts/mcp-tool-catalog.json");
  const coreLock = await json("contracts/core-lock.json");
  const coreManifestBytes = await readFile(join(root, "contracts/core-manifest.json"));
  const coreManifest = JSON.parse(coreManifestBytes);
  if (plugin.name !== manifest.plugin.name || plugin.version !== manifest.plugin.version || manifest.plugin.host !== "codex" || plugin.version !== compatibility.plugin_version) throw new Error("Release plugin identity mismatch");
  if (manifest.server_contract.min !== catalog.server_contract_version || manifest.server_contract.max !== catalog.server_contract_version || JSON.stringify(manifest.server_contract) !== JSON.stringify(compatibility.server_contract)) throw new Error("Release catalog contract mismatch");
  if (sha256(await readFile(join(root, "contracts/mcp-tool-catalog.json"))) !== manifest.catalog_sha256 || coreManifest.files["contracts/mcp-tool-catalog.json"] !== manifest.catalog_sha256) throw new Error("Release catalog digest mismatch");
  if (sha256(coreManifestBytes) !== coreLock.manifest_sha256 || JSON.stringify(coreLock) !== JSON.stringify(manifest.core) || coreLock.version !== coreManifest.version || coreLock.name !== coreManifest.name) throw new Error("Release Core identity mismatch");
  for (const [file, digest] of Object.entries(coreManifest.files)) {
    if (file.startsWith("references/") || file.startsWith("helpers/") || file.startsWith("contracts/")) {
      const packaged = file.replace(/^helpers\//, "scripts/").replace(/^references\//, "references/core/").replace(/^contracts\//, "contracts/core/");
      if (sha256(await readFile(join(root, packaged))) !== digest) throw new Error(`Release Core digest mismatch: ${file}`);
    }
  }
  const mapping = await json("contracts/skill-tool-map.json");
  await validateSkillClosure({ root, mapping, catalog, skillDirectory: "skills" });
  return { plugin: plugin.name, version: plugin.version, files: actual.length };
}

if (process.argv[1] && await realpath(process.argv[1]) === await realpath(fileURLToPath(import.meta.url))) {
  const index = process.argv.indexOf("--package");
  const root = resolve(index >= 0 ? process.argv[index + 1] : join(dirname(fileURLToPath(import.meta.url)), ".."));
  const result = await verifyRelease(root);
  console.log(`Portable release verified: ${result.plugin}@${result.version}, ${result.files} files.`);
}
