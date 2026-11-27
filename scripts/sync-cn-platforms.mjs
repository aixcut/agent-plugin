#!/usr/bin/env node
/**
 * Sync domestic (.cn) desktop platform runtime bundles into agent-plugin:
 * - kimi/   <- ../kimi-plugin (runtime files only, matching package-kimi.mjs)
 * - doubao/ <- ../aixcut-doubao-plugin (runtime files only: plugin.json, mcp.json, com.doubao/, skills/, LICENSE, README.md)
 * - qwen/   <- shared business skills + references/core from kimi/ (preserving qwen-specific manifest, .mcp.json, CONNECTORS.md, README.md, skills/aixcut-host/)
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const workspaceRoot = resolve(repoRoot, "..");

const value = (flag, fallback) => {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && process.argv[idx + 1] ? resolve(process.argv[idx + 1]) : fallback;
};

const kimiSource = value("--kimi-source", join(workspaceRoot, "kimi-plugin"));
const doubaoSource = value("--doubao-source", join(workspaceRoot, "aixcut-doubao-plugin"));

const KIMI_RUNTIME_FILES = ["kimi.plugin.json", "SYSTEM.md", "icon.png", "LICENSE"];
const KIMI_RUNTIME_DIRS = ["assets", "locales", "references", "contracts", "skills"];
const KIMI_RUNTIME_SCRIPTS = [
  "contract-semantics.mjs",
  "download-capture-artifacts.mjs",
  "review-evidence.mjs",
  "schema-validators.mjs",
  "trace-events.mjs",
  "validate-contract.mjs",
  "workflow-evaluation.mjs",
  "workflow-host.mjs",
  "workflow-state.mjs",
  "workflow-trace-adapter.mjs",
];

const DOUBAO_RUNTIME_FILES = ["plugin.json", "mcp.json", "LICENSE", "README.md"];
const DOUBAO_RUNTIME_DIRS = ["com.doubao", "skills"];

const cleanAndCopy = (src, dest) => {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
};

const syncKimi = () => {
  if (!existsSync(kimiSource)) throw new Error(`Kimi source repo not found: ${kimiSource}`);
  const target = join(repoRoot, "kimi");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  for (const file of KIMI_RUNTIME_FILES) {
    cpSync(join(kimiSource, file), join(target, file));
  }
  for (const dir of KIMI_RUNTIME_DIRS) {
    cpSync(join(kimiSource, dir), join(target, dir), { recursive: true });
  }
  mkdirSync(join(target, "scripts"), { recursive: true });
  for (const script of KIMI_RUNTIME_SCRIPTS) {
    cpSync(join(kimiSource, "scripts", script), join(target, "scripts", script));
  }
  console.log(`Synced kimi/ from ${kimiSource}`);
};

const syncDoubao = () => {
  if (!existsSync(doubaoSource)) throw new Error(`Doubao source repo not found: ${doubaoSource}`);
  const target = join(repoRoot, "doubao");
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });

  for (const file of DOUBAO_RUNTIME_FILES) {
    cpSync(join(doubaoSource, file), join(target, file));
  }
  for (const dir of DOUBAO_RUNTIME_DIRS) {
    cpSync(join(doubaoSource, dir), join(target, dir), { recursive: true });
  }
  console.log(`Synced doubao/ from ${doubaoSource}`);
};

const syncQwenShared = () => {
  const kimiDir = join(repoRoot, "kimi");
  const qwenDir = join(repoRoot, "qwen");
  if (!existsSync(kimiDir)) throw new Error("kimi/ must be synced before qwen/");
  mkdirSync(join(qwenDir, "skills"), { recursive: true });

  // Sync LICENSE and references/core
  cpSync(join(kimiDir, "LICENSE"), join(qwenDir, "LICENSE"));
  cleanAndCopy(join(kimiDir, "references", "core"), join(qwenDir, "references", "core"));

  // Sync all shared skills except host-specific aixcut-host
  const skillNames = readdirSync(join(kimiDir, "skills"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== "aixcut-host")
    .map((entry) => entry.name)
    .sort();

  for (const name of skillNames) {
    cleanAndCopy(join(kimiDir, "skills", name), join(qwenDir, "skills", name));
  }

  // Keep .qwenwork-plugin/plugin.json skills list aligned
  const manifestPath = join(qwenDir, ".qwenwork-plugin", "plugin.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const allSkills = ["aixcut-host", ...skillNames].map((name) => `skills/${name}`);
    manifest.skills = allSkills;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(`Synced qwen/ shared skills (${skillNames.length} skills + references/core)`);
};

syncKimi();
syncDoubao();
syncQwenShared();
