import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const validate = (cwd: string) =>
  spawnSync("node", [resolve(root, "scripts/validate.mjs"), "--root", cwd], {
    cwd,
    encoding: "utf8",
  });

describe("release validation", () => {
  it("accepts the complete plugin package source", () => {
    const result = validate(root);
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });

  it("rejects a manifest version that drifts from compatibility metadata", () => {
    const copy = mkdtempSync(join(tmpdir(), "aixcut-plugin-invalid-"));
    try {
      cpSync(root, copy, {
        recursive: true,
        filter: (source) => !source.includes("node_modules") && !source.includes(".git"),
      });
      const manifestPath = join(copy, "codex/.codex-plugin/plugin.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
      manifest.version = "9.9.9";
      writeFileSync(manifestPath, JSON.stringify(manifest));
      const result = validate(copy);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain("compatibility");
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  });

  it("rejects a stale generated Codex package", () => {
    const copy = mkdtempSync(join(tmpdir(), "aixcut-plugin-stale-"));
    try {
      cpSync(root, copy, {
        recursive: true,
        filter: (source) => !source.includes("node_modules") && !source.includes(".git"),
      });
      writeFileSync(join(copy, "codex/skills/aixcut-basics/SKILL.md"), "stale package");
      const result = validate(copy);
      expect(result.status).not.toBe(0);
      expect(`${result.stdout}\n${result.stderr}`).toContain("stale");
    } finally {
      rmSync(copy, { recursive: true, force: true });
    }
  });
});
