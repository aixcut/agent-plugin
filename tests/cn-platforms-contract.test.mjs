import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

const walkFiles = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
};

test("kimi/ runtime bundle has valid manifest, domestic .cn MCP URL, and no zip artifacts", () => {
  const dir = join(repoRoot, "kimi");
  assert.ok(existsSync(dir), "kimi/ directory must exist");
  const manifest = JSON.parse(readFileSync(join(dir, "kimi.plugin.json"), "utf8"));
  assert.equal(manifest.name, "aixcut");
  assert.equal(manifest.mcpServers?.aixcut?.url, "https://web.aixcut.cn/mcp");
  assert.ok(existsSync(join(dir, "SYSTEM.md")));
  assert.ok(existsSync(join(dir, "skills", "aixcut-host", "SKILL.md")));
  assert.ok(existsSync(join(dir, "skills", "aixcut-basics", "SKILL.md")));
  assert.ok(!existsSync(join(dir, "scripts", "local-media-bridge.mjs")), "kimi/ must not ship local-media-bridge.mjs");
  const zips = walkFiles(dir).filter((f) => f.endsWith(".zip"));
  assert.deepEqual(zips, [], "kimi/ must not commit zip archives");
});

test("doubao/ runtime bundle has valid Plugin 1.0 manifest, domestic .cn MCP URL, and single-level skill", () => {
  const dir = join(repoRoot, "doubao");
  assert.ok(existsSync(dir), "doubao/ directory must exist");
  const manifest = JSON.parse(readFileSync(join(dir, "plugin.json"), "utf8"));
  const mcp = JSON.parse(readFileSync(join(dir, "mcp.json"), "utf8"));
  assert.equal(manifest.name, "aixcut-video-editor");
  assert.equal(mcp.mcpServers?.aixcut?.url, "https://web.aixcut.cn/mcp");
  assert.ok(existsSync(join(dir, "skills", "aixcut-video-editor", "SKILL.md")));
  assert.ok(existsSync(join(dir, "com.doubao", "assets", "plugin-icon.png")));
  const zips = walkFiles(dir).filter((f) => f.endsWith(".zip"));
  assert.deepEqual(zips, [], "doubao/ must not commit zip archives");
});

test("qwen/ runtime bundle follows QwenWorkCN .qwenwork-plugin spec and lists every skill", () => {
  const dir = join(repoRoot, "qwen");
  assert.ok(existsSync(dir), "qwen/ directory must exist");
  const manifest = JSON.parse(readFileSync(join(dir, ".qwenwork-plugin", "plugin.json"), "utf8"));
  const mcp = JSON.parse(readFileSync(join(dir, ".mcp.json"), "utf8"));
  assert.equal(manifest.name, "aixcut");
  assert.ok(manifest.displayNameEn && manifest.displayNameCn);
  assert.ok(Array.isArray(manifest.skills) && manifest.skills.length >= 16);
  for (const relSkill of manifest.skills) {
    assert.ok(existsSync(join(dir, relSkill, "SKILL.md")), `Missing ${relSkill}/SKILL.md`);
  }
  assert.equal(mcp.mcpServers?.aixcut?.type, "guided-setup");
  assert.equal(mcp.mcpServers?.aixcut?._setup?.url, "https://aixcut.cn/qwen");
  assert.ok(existsSync(join(dir, "CONNECTORS.md")));
  assert.ok(existsSync(join(dir, "references", "core")));
  const zips = walkFiles(dir).filter((f) => f.endsWith(".zip"));
  assert.deepEqual(zips, [], "qwen/ must not commit zip archives");
});

test("codex/ marketplace and openai/ international MCP config remain intact", () => {
  const marketplace = JSON.parse(readFileSync(join(repoRoot, ".agents", "plugins", "marketplace.json"), "utf8"));
  assert.equal(marketplace.plugins?.[0]?.source?.path, "./codex");
  const openaiMcp = JSON.parse(readFileSync(join(repoRoot, "openai", "mcp.json"), "utf8"));
  assert.equal(openaiMcp.mcpServers?.aixcut?.url, "https://web.aixcut.com/mcp");
});
