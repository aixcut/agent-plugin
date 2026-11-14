import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MARKETPLACE_ANCHOR,
  MARKETPLACE_SENTENCE,
  checkOpenAiSkillSync,
  transformSharedSkill,
  writeOpenAiSkillSync,
} from "../scripts/sync-openai-skills.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "codex/skills");
const targetRoot = join(root, "openai/skills");

const fixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), "aixcut-openai-sync-"));
  const source = join(dir, "codex/skills");
  const target = join(dir, "openai/skills");
  await mkdir(join(source, "aixcut-basics"), { recursive: true });
  await mkdir(join(source, "aixcut-captions/references"), { recursive: true });
  await mkdir(join(target, "aixcut-basics"), { recursive: true });
  await writeFile(
    join(source, "aixcut-basics/SKILL.md"),
    `# Basics\n\n${MARKETPLACE_ANCHOR}\n`,
  );
  await writeFile(join(source, "aixcut-captions/references/actions.md"), "source-actions\n");
  return { dir, source, target };
};

const roots = new Set();
test.after(async () => {
  await Promise.all([...roots].map((dir) => rm(dir, { recursive: true, force: true })));
});

test("the OpenAI package keeps every shared Skill byte-identical to Codex except host-owned text", async () => {
  const result = await checkOpenAiSkillSync({ sourceRoot, targetRoot });
  assert.deepEqual(result.drifted, []);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.extra, []);
  assert.equal(result.ok, true);
  assert.ok(result.files.length > 20, "the sync covers every shared Skill file");
});

test("reports a target file that fell behind the source", async () => {
  const { dir, source, target } = await fixture();
  roots.add(dir);
  await mkdir(join(target, "aixcut-captions/references"), { recursive: true });
  await writeFile(join(target, "aixcut-captions/references/actions.md"), "stale-actions\n");
  const result = await checkOpenAiSkillSync({ sourceRoot: source, targetRoot: target });
  assert.equal(result.ok, false);
  assert.deepEqual(result.drifted, ["aixcut-captions/references/actions.md"]);
});

test("reports a target file whose missing source is a hard error", async () => {
  const { dir, source, target } = await fixture();
  roots.add(dir);
  await mkdir(join(target, "aixcut-voice"), { recursive: true });
  await writeFile(join(target, "aixcut-voice/SKILL.md"), "orphan\n");
  const result = await checkOpenAiSkillSync({ sourceRoot: source, targetRoot: target });
  assert.equal(result.ok, false);
  assert.deepEqual(result.extra, ["aixcut-voice/SKILL.md"]);
});

test("write mode makes the target pass the check and drops orphan files", async () => {
  const { dir, source, target } = await fixture();
  roots.add(dir);
  await writeOpenAiSkillSync({ sourceRoot: source, targetRoot: target });
  const result = await checkOpenAiSkillSync({ sourceRoot: source, targetRoot: target });
  assert.equal(result.ok, true);
  const basics = await readFile(join(target, "aixcut-basics/SKILL.md"), "utf8");
  assert.ok(basics.includes(MARKETPLACE_ANCHOR));
  assert.ok(basics.includes(MARKETPLACE_SENTENCE));
  await assert.rejects(() => stat(join(target, "aixcut-voice/SKILL.md")));
});

test("the host-owned marketplace sentence is added once and stays idempotent", () => {
  const once = transformSharedSkill("aixcut-basics/SKILL.md", `# Basics\n\n${MARKETPLACE_ANCHOR}\n`);
  const twice = transformSharedSkill("aixcut-basics/SKILL.md", once);
  assert.equal(once, twice);
  assert.equal(once.split(MARKETPLACE_SENTENCE).length - 1, 1);
  const untouched = transformSharedSkill("aixcut-voice/SKILL.md", "body\n");
  assert.equal(untouched, "body\n");
});

test("the OpenAI basics Skill still carries the marketplace upgrade instruction", async () => {
  const text = await readFile(join(targetRoot, "aixcut-basics/SKILL.md"), "utf8");
  assert.ok(text.includes(MARKETPLACE_SENTENCE));
  assert.ok(text.includes(MARKETPLACE_ANCHOR));
});
