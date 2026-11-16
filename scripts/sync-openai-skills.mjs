#!/usr/bin/env node
/**
 * OpenAI 分发包的 Skill 同步。
 *
 * `codex/skills` 是共享业务 Skill 的唯一来源；`openai/skills` 是派生产物。
 * 过去它是手工副本，结果整份落后（缺导出双路径、plan_context 要求、前端请求形状、
 * Agent 直传素材等），而没有任何检查会发现。这里把它变成可校验的派生：
 *
 * - 默认 `--check`：内容与来源不一致、目标缺文件、目标多出孤儿文件都算失败。
 * - `--write`：按来源重写目标，并删除来源里不存在的孤儿文件。
 *
 * 唯一的宿主差异是 `aixcut-basics` 里的插件市场升级说明，由 `transformSharedSkill`
 * 显式追加，不做其他自由改写。
 */
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));

export const MARKETPLACE_ANCHOR =
  "At the start of the first Aixcut workflow in each new Codex task, follow [plugin maintenance](references/plugin-maintenance.md) once.";

export const MARKETPLACE_SENTENCE =
  " Check the configured GitHub or Gitee marketplace, ask before upgrading, preserve the existing MCP configuration and authorization, and start a fresh task after a successful upgrade.";

/** 宿主差异只有这一处：OpenAI 侧要求先检查插件市场再升级。 */
export const transformSharedSkill = (path, text) => {
  if (path !== "aixcut-basics/SKILL.md") return text;
  if (!text.includes(MARKETPLACE_ANCHOR)) throw new Error(`aixcut-basics/SKILL.md 缺少插件维护锚点：${MARKETPLACE_ANCHOR}`);
  if (text.includes(MARKETPLACE_SENTENCE)) return text;
  return text.replace(MARKETPLACE_ANCHOR, `${MARKETPLACE_ANCHOR}${MARKETPLACE_SENTENCE}`);
};

const normalize = (path) => path.split("\\").join("/");

const collectFiles = async (root, prefix = "", collected = []) => {
  const entries = await readdir(join(root, prefix), { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") throw new Error(`Skill 目录不存在：${join(root, prefix)}`);
    throw error;
  });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await collectFiles(root, path, collected);
    else if (entry.isFile()) collected.push(normalize(path));
  }
  return collected;
};

export const computeOpenAiSkillSync = async ({ sourceRoot, targetRoot }) => {
  if (!sourceRoot || !targetRoot) throw new Error("computeOpenAiSkillSync 需要 sourceRoot 与 targetRoot");
  if (!existsSync(sourceRoot)) throw new Error(`共享 Skill 来源不可用：${sourceRoot}`);
  const sourceFiles = await collectFiles(sourceRoot);
  if (sourceFiles.length === 0) throw new Error(`共享 Skill 来源为空：${sourceRoot}`);
  const targetFiles = existsSync(targetRoot) ? await collectFiles(targetRoot) : [];
  const targetSet = new Set(targetFiles);
  const sourceSet = new Set(sourceFiles);
  const files = [];
  const drifted = [];
  const missing = [];
  for (const path of sourceFiles) {
    const expected = transformSharedSkill(path, await readFile(join(sourceRoot, path), "utf8"));
    if (!targetSet.has(path)) {
      missing.push(path);
      files.push({ path, expected, actual: undefined });
      continue;
    }
    const actual = await readFile(join(targetRoot, path), "utf8");
    if (actual !== expected) drifted.push(path);
    files.push({ path, expected, actual });
  }
  const extra = targetFiles.filter((path) => !sourceSet.has(path));
  return {
    sourceRoot,
    targetRoot,
    files,
    drifted,
    missing,
    extra,
    ok: drifted.length === 0 && missing.length === 0 && extra.length === 0,
  };
};

export const checkOpenAiSkillSync = (options) => computeOpenAiSkillSync(options);

export const writeOpenAiSkillSync = async ({ sourceRoot, targetRoot }) => {
  const result = await computeOpenAiSkillSync({ sourceRoot, targetRoot });
  for (const file of result.files) {
    const target = join(targetRoot, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.expected);
  }
  for (const path of result.extra) await rm(join(targetRoot, path));
  return { written: result.files.length, removed: result.extra.length };
};

const value = (name) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const main = async () => {
  const sourceRoot = resolve(value("--source-root") ?? join(repoRoot, "codex/skills"));
  const targetRoot = resolve(value("--target-root") ?? join(repoRoot, "openai/skills"));
  if (process.argv.includes("--write")) {
    const { written, removed } = await writeOpenAiSkillSync({ sourceRoot, targetRoot });
    console.log(`OpenAI Skills 已同步：写入 ${written} 个文件，删除 ${removed} 个孤儿文件。`);
    return;
  }
  const result = await checkOpenAiSkillSync({ sourceRoot, targetRoot });
  console.log(`OpenAI Skills 同步检查：${result.files.length} 个文件，内容落后 ${result.drifted.length}，缺失 ${result.missing.length}，孤儿 ${result.extra.length}。`);
  if (!result.ok) {
    for (const path of result.drifted) console.error(`  落后：${normalize(relative(sourceRoot, join(sourceRoot, path)))}`);
    for (const path of result.missing) console.error(`  缺失：${path}`);
    for (const path of result.extra) console.error(`  孤儿：${path}`);
    console.error("运行 node scripts/sync-openai-skills.mjs --write 后重新检查。");
    process.exitCode = 1;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
