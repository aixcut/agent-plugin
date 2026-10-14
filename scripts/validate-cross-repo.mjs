#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const value = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const root = resolve(value("--root") ?? new URL("..", import.meta.url).pathname);
const serverRoot = resolve(root, value("--server-root") ?? "../aixcut-mcp-server");
const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const catalog = await json(resolve(root, "contracts/mcp-tool-catalog.json"));
const compatibility = await json(resolve(root, "contracts/compatibility.json"));
const snapshot = await json(resolve(serverRoot, "contracts/tools.snapshot.json"));
const versionSource = await readFile(resolve(serverRoot, "src/shared/contracts/contract-version.ts"), "utf8");
const version = versionSource.match(/CONTRACT_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
if (!version) throw new Error("Unable to read server CONTRACT_VERSION.");
if (catalog.server_contract_version !== version) throw new Error(`Catalog contract ${catalog.server_contract_version} does not match server ${version}.`);
if (compatibility.server_contract.min !== version || compatibility.server_contract.max !== version) throw new Error("Plugin compatibility range does not match the server contract.");

const catalogByName = new Map(catalog.tools.map((tool) => [tool.name, [...tool.actions].sort()]));
const snapshotNames = Object.keys(snapshot).sort();
for (const name of snapshotNames) {
  const actual = Object.keys(snapshot[name]).sort();
  const expected = catalogByName.get(name);
  if (!expected) throw new Error(`Catalog is missing server Tool ${name}.`);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) throw new Error(`Catalog actions for ${name} do not match the server snapshot.`);
}
for (const [name, actions] of catalogByName) {
  if (actions.length > 0 && !Object.hasOwn(snapshot, name)) throw new Error(`Catalog contains actionful Tool ${name} missing from the server snapshot.`);
}
console.log(`Cross-repository contract passed: ${version}, ${snapshotNames.length} actionful Tools.`);
