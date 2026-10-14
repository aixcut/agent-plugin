import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const build = (out: string, sourceRoot = root) =>
  spawnSync("node", [resolve(root, "scripts/build.mjs"), "--root", sourceRoot, "--out", out], {
    cwd: root,
    encoding: "utf8",
  });

const treeHash = (directory: string) => {
  const hash = createHash("sha256");
  const visit = (current: string): void => {
    for (const name of readdirSync(current).sort()) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) visit(path);
      else {
        hash.update(path.slice(directory.length));
        hash.update(readFileSync(path));
      }
    }
  };
  visit(directory);
  return hash.digest("hex");
};

describe("Codex package build", () => {
  it("builds into the marketplace path without deleting its manifest", () => {
    const result = spawnSync("node", [resolve(root, "scripts/build.mjs")], {
      cwd: root,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(root, "codex/.codex-plugin/plugin.json"), "utf8")).toContain(
      '"name": "aixcut-codex-plugin"',
    );
    expect(readFileSync(join(root, "codex/skills/aixcut-basics/SKILL.md"), "utf8")).toContain(
      "name: aixcut-basics",
    );
  });

  it("copies only the manifest and shared package assets into a portable output", () => {
    const out = mkdtempSync(join(tmpdir(), "aixcut-plugin-build-"));
    try {
      const result = build(out);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(out, ".codex-plugin/plugin.json"), "utf8")).toContain(
        '"name": "aixcut-codex-plugin"',
      );
      expect(readFileSync(join(out, "skills/aixcut-basics/SKILL.md"), "utf8")).toBe(
        readFileSync(join(root, "shared/skills/aixcut-basics/SKILL.md"), "utf8"),
      );
      expect(readFileSync(join(out, "scripts/local-media-bridge.mjs"), "utf8")).toBe(
        readFileSync(join(root, "vendor/plugin-core/helpers/local-media-bridge.mjs"), "utf8"),
      );
      expect(readFileSync(join(out, "assets/logo.svg"), "utf8")).toBe(
        readFileSync(join(root, "shared/assets/logo.svg"), "utf8"),
      );
      expect(() => readFileSync(join(out, ".mcp.json"))).toThrow();
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it("produces byte-identical packages on repeated builds", () => {
    const first = mkdtempSync(join(tmpdir(), "aixcut-plugin-first-"));
    const second = mkdtempSync(join(tmpdir(), "aixcut-plugin-second-"));
    try {
      expect(build(first).status).toBe(0);
      expect(build(second).status).toBe(0);
      expect(treeHash(first)).toBe(treeHash(second));
    } finally {
      rmSync(first, { recursive: true, force: true });
      rmSync(second, { recursive: true, force: true });
    }
  });

  it("does not publish files outside the explicit package allowlist", () => {
    const source = mkdtempSync(join(tmpdir(), "aixcut-plugin-source-"));
    const output = join(source, "dist/package");
    try {
      cpSync(root, source, {
        recursive: true,
        filter: (path) => !path.includes("node_modules") && !path.includes("/.git") && !path.includes("/dist"),
      });
      mkdirSync(join(source, "shared/skills/aixcut-basics"), { recursive: true });
      writeFileSync(join(source, "shared/skills/aixcut-basics/private-notes.txt"), "must not ship");
      mkdirSync(join(source, "shared/scripts"), { recursive: true });
      writeFileSync(join(source, "shared/scripts/private-helper.mjs"), "must not ship");
      const result = build(output, source);
      expect(result.status, result.stderr).toBe(0);
      expect(() => readFileSync(join(output, "skills/aixcut-basics/private-notes.txt"))).toThrow();
      expect(() => readFileSync(join(output, "scripts/private-helper.mjs"))).toThrow();
      expect(() => readFileSync(join(output, "contracts/mcp-tool-catalog.json"))).toThrow();
    } finally {
      rmSync(source, { recursive: true, force: true });
    }
  });

  it("builds helpers from the pinned core snapshot without a sibling core checkout", () => {
    const source = mkdtempSync(join(tmpdir(), "aixcut-plugin-core-isolation-"));
    const output = join(source, "dist/package");
    try {
      cpSync(root, source, {
        recursive: true,
        filter: (path) => !path.includes("node_modules") && !path.includes("/.git") && !path.includes("/dist"),
      });
      const result = build(output, source);
      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(join(output, "scripts/local-media-bridge.mjs"), "utf8"))
        .toBe(readFileSync(join(source, "vendor/plugin-core/helpers/local-media-bridge.mjs"), "utf8"));
    } finally {
      rmSync(source, { recursive: true, force: true });
    }
  });
});
