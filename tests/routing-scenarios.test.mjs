import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const scenarios = JSON.parse(readFileSync(join(root, "tests/fixtures/routing-scenarios.json"), "utf8"));
const catalog = JSON.parse(readFileSync(join(root, "codex/contracts/mcp-tool-catalog.json"), "utf8"));
const tools = new Map(catalog.tools.map((tool) => [tool.name, new Set(tool.actions ?? [])]));
const routes = new Set(["inspect_only", "mechanical", "local_edit", "talking_head", "full_assembly", "focused_task"]);

test("routing scenarios use real Skills, routes and tools", () => {
  assert.ok(scenarios.length >= 10);
  assert.deepEqual(new Set(scenarios.map((scenario) => scenario.route)), routes);
  for (const scenario of scenarios) {
    assert.ok(existsSync(join(root, "codex/skills", scenario.mainSkill, "SKILL.md")), `${scenario.id}: ${scenario.mainSkill}`);
    for (const skill of scenario.requiredSkills) assert.ok(existsSync(join(root, "codex/skills", skill, "SKILL.md")), `${scenario.id}: ${skill}`);
    for (const tool of [...scenario.requiredTools, ...scenario.forbiddenTools]) assert.ok(tools.has(tool), `${scenario.id}: ${tool}`);
    assert.ok(scenario.sequence.length > 0, `${scenario.id}: sequence`);
  }
});

test("scenario contracts preserve the important ordering guarantees", () => {
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  const sequence = (id) => byId.get(id).sequence;
  assert.ok(sequence("talking-head-cleanup").indexOf("read_source_lines") < sequence("talking-head-cleanup").indexOf("speech_edit"));
  assert.ok(sequence("voice-with-quote").indexOf("speech_quote") < sequence("voice-with-quote").indexOf("speech_submit"));
  assert.ok(sequence("voice-with-quote").indexOf("user_accepted") < sequence("voice-with-quote").indexOf("speech_submit"));
  assert.ok(sequence("export-requested").indexOf("review") < sequence("export-requested").indexOf("export_submit"));
  assert.ok(sequence("assembly-promo").indexOf("visual_structure") < sequence("assembly-promo").indexOf("captions"));
  assert.ok(sequence("layout-vertical").indexOf("layout_set") < sequence("layout-vertical").indexOf("capture_timeline_frames"));
  assert.ok(byId.get("mechanical-trim").forbiddenTools.includes("aixcut_export"));
  assert.ok(byId.get("caption-from-speech").forbiddenTools.includes("aixcut_text"));
});

test("routing scenarios forbid premature expensive or destructive calls", () => {
  for (const scenario of scenarios.filter((item) => ["mechanical", "talking_head", "local_edit"].includes(item.route))) {
    assert.equal(scenario.forbiddenTools.includes("aixcut_export"), true, `${scenario.id}: export must be explicit`);
  }
});
