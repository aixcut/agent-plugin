import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const build = (sourceRoot: string, out: string) => spawnSync("node", [resolve(root, "scripts/build.mjs"), "--root", sourceRoot, "--out", out], { cwd: root, encoding: "utf8" });

describe("portable Codex release manifest", () => {
  it("runs its bundled verifier from an isolated working directory without repository dependencies", () => {
    const out = mkdtempSync(join(tmpdir(), "aixcut-isolated-package-"));
    try {
      expect(build(root, out).status).toBe(0);
      const result = spawnSync(process.execPath, [join(out, "scripts/verify-release.mjs"), "--package", out], { cwd: tmpdir(), encoding: "utf8" });
      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain("Portable release verified");
    } finally { rmSync(out, { recursive: true, force: true }); }
  });

  it("emits a self-contained manifest with package file digests", () => {
    const out = mkdtempSync(join(tmpdir(), "aixcut-manifest-"));
    try {
      expect(build(root, out).status).toBe(0);
      const manifest = JSON.parse(readFileSync(join(out, "release-manifest.json"), "utf8"));
      expect(manifest.schema_version).toBe(1);
      expect(manifest.plugin.name).toBe("aixcut-codex-plugin");
      expect(manifest.files).toEqual(expect.arrayContaining([
        expect.objectContaining({ path: ".codex-plugin/plugin.json" }),
        expect.objectContaining({ path: "skills/aixcut-basics/SKILL.md" }),
      ]));
      expect(manifest.files).not.toEqual(expect.arrayContaining([expect.objectContaining({ path: "release-manifest.json" })]));
    } finally { rmSync(out, { recursive: true, force: true }); }
  });

  it("fails independent verification when a packaged file is modified", () => {
    const source = mkdtempSync(join(tmpdir(), "aixcut-manifest-source-"));
    const out = join(source, "dist");
    try {
      cpSync(root, source, { recursive: true, filter: (path) => !path.includes("node_modules") && !path.includes("/.git") && !path.includes("/dist") });
      expect(build(source, out).status).toBe(0);
      writeFileSync(join(out, "skills/aixcut-basics/SKILL.md"), "tampered");
      const result = spawnSync("node", [resolve(root, "scripts/verify-release.mjs"), "--package", out], { cwd: root, encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toMatch(/digest|tamper|mismatch/i);
    } finally { rmSync(source, { recursive: true, force: true }); }
  });

  it.each(["added", "missing"])("rejects an %s file in the package inventory", (scenario) => {
    const out = mkdtempSync(join(tmpdir(), "aixcut-inventory-"));
    try {
      expect(build(root, out).status).toBe(0);
      if (scenario === "added") writeFileSync(join(out, "unlisted.txt"), "unexpected");
      else rmSync(join(out, "assets/logo.svg"));
      const result = spawnSync(process.execPath, [join(out, "scripts/verify-release.mjs"), "--package", out], { cwd: tmpdir(), encoding: "utf8" });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("inventory mismatch");
    } finally { rmSync(out, { recursive: true, force: true }); }
  });
});
