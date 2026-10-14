#!/usr/bin/env node
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { verifyCore } from "./core.mjs";

const args = process.argv.slice(2);
const value = (name) => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const root = resolve(value("--root") ?? resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const source = value("--core-root");
if (!source) throw new Error("Explicit --core-root is required");
const coreRoot = resolve(source);
const staged = await mkdtemp(join(tmpdir(), "aixcut-codex-core-import-"));
try {
  const manifestBytes = await readFile(join(coreRoot, "contracts/core-manifest.json"));
  const manifest = JSON.parse(manifestBytes);
  const paths = ["package.json", "LICENSE", "contracts/core-manifest.json", ...Object.keys(manifest.files)];
  for (const filePath of paths) {
    if (filePath.startsWith("/") || filePath.split("/").includes("..")) throw new Error("Invalid core file path");
    const target = join(staged, "vendor/plugin-core", filePath);
    await mkdir(dirname(target), { recursive: true });
    await cp(join(coreRoot, filePath), target, { recursive: false, dereference: false });
  }
  await mkdir(join(staged, "contracts"), { recursive: true });
  await cp(join(coreRoot, "contracts/mcp-tool-catalog.json"), join(staged, "contracts/mcp-tool-catalog.json"));
  await writeFile(join(staged, "contracts/core-lock.json"), JSON.stringify({
    name: manifest.name,
    version: manifest.version,
    manifest_sha256: createHash("sha256").update(manifestBytes).digest("hex"),
  }, null, 2) + "\n");
  await verifyCore(staged);
  const compatibility = JSON.parse(await readFile(join(root, "contracts/compatibility.json"), "utf8"));
  if (manifest.server_contract_version !== compatibility.server_contract.min || manifest.server_contract_version !== compatibility.server_contract.max) throw new Error("Core server contract requires a reviewed compatibility update");
  if (manifest.helper_schema_version !== compatibility.helper_schema_version) throw new Error("Core helper schema requires a reviewed compatibility update");
  await rm(join(root, "vendor/plugin-core"), { recursive: true, force: true });
  await mkdir(join(root, "vendor"), { recursive: true });
  await cp(join(staged, "vendor/plugin-core"), join(root, "vendor/plugin-core"), { recursive: true });
  await cp(join(staged, "contracts/mcp-tool-catalog.json"), join(root, "contracts/mcp-tool-catalog.json"));
  await cp(join(staged, "contracts/core-lock.json"), join(root, "contracts/core-lock.json"));
  console.log("Imported core " + manifest.version);
} finally {
  await rm(staged, { recursive: true, force: true });
}
