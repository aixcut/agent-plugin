import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const coreRoot = path.resolve(projectRoot, "vendor/plugin-core");
const tempRoots: string[] = [];

const fixture = () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "aixcut-codex-core-"));
  tempRoots.push(root);
  mkdirSync(path.join(root, "contracts"), { recursive: true });
  writeFileSync(path.join(root, "contracts/compatibility.json"), JSON.stringify({
    plugin_version: "1.1.0",
    server_contract: { min: "1.3.0", max: "1.3.0" },
    helper_schema_version: "1.0.0",
  }));
  mkdirSync(path.join(root, "vendor/plugin-core"), { recursive: true });
  writeFileSync(path.join(root, "vendor/plugin-core/old.txt"), "existing snapshot");
  writeFileSync(path.join(root, "contracts/core-lock.json"), "existing lock");
  return root;
};

const runImport = (root: string, source = coreRoot) => spawnSync(
  process.execPath,
  [path.join(projectRoot, "scripts/import-core.mjs"), "--root", root, "--core-root", source],
  { encoding: "utf8" },
);

afterEach(() => {
  for (const root of tempRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Codex core snapshot import", () => {
  it("imports and locks the verified core snapshot", () => {
    const root = fixture();
    const result = runImport(root);
    expect(result.status, result.stderr || result.stdout).toBe(0);

    const manifestBytes = readFileSync(path.join(root, "vendor/plugin-core/contracts/core-manifest.json"));
    const lock = JSON.parse(readFileSync(path.join(root, "contracts/core-lock.json"), "utf8"));
    const sourceManifest = JSON.parse(readFileSync(path.join(coreRoot, "contracts/core-manifest.json"), "utf8"));
    expect(lock).toEqual({
      name: "@aixcut/plugin-core",
      version: sourceManifest.version,
      manifest_sha256: createHash("sha256").update(manifestBytes).digest("hex"),
    });
    expect(readFileSync(path.join(root, "contracts/mcp-tool-catalog.json"), "utf8"))
      .toBe(readFileSync(path.join(coreRoot, "contracts/mcp-tool-catalog.json"), "utf8"));
    expect(existsSync(path.join(root, "vendor/plugin-core/helpers/local-media-bridge.mjs"))).toBe(true);
  });

  it("rejects a modified core file without changing the existing snapshot or lock", () => {
    const root = fixture();
    const badCore = path.join(root, "bad-core");
    cpSync(coreRoot, badCore, { recursive: true });
    writeFileSync(path.join(badCore, "helpers/local-media-bridge.mjs"), "tampered");

    const result = runImport(root, badCore);

    expect(result.status).not.toBe(0);
    expect(readFileSync(path.join(root, "vendor/plugin-core/old.txt"), "utf8")).toBe("existing snapshot");
    expect(readFileSync(path.join(root, "contracts/core-lock.json"), "utf8")).toBe("existing lock");
  });

  it.each(["server_contract", "helper_schema_version"])("rejects incompatible %s before replacing the snapshot", (field) => {
    const root = fixture();
    const compatibilityPath = path.join(root, "contracts/compatibility.json");
    const compatibility = JSON.parse(readFileSync(compatibilityPath, "utf8"));
    compatibility[field] = field === "server_contract" ? { min: "9.0.0", max: "9.0.0" } : "9.0.0";
    writeFileSync(compatibilityPath, JSON.stringify(compatibility));
    const result = runImport(root);
    expect(result.status).not.toBe(0);
    expect(readFileSync(path.join(root, "vendor/plugin-core/old.txt"), "utf8")).toBe("existing snapshot");
    expect(readFileSync(path.join(root, "contracts/core-lock.json"), "utf8")).toBe("existing lock");
  });
});
