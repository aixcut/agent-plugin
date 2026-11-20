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

test("assembly guidance freezes editorial intent before dependent layers", () => {
  const assembly = readFileSync(join(root, "codex/skills/aixcut-video-assembly/SKILL.md"), "utf8");
  assert.match(assembly, /editorial intent|创作目标|主题|叙事/i);
  assert.match(assembly, /freeze|冻结[\s\S]{0,80}(shot|镜头|结构)/i);
  assert.match(assembly, /captions[\s\S]{0,120}(visual|视觉|annotation|包装)/i);
});

test("talking-head guidance names A-roll as the upstream dependency", () => {
  const talkingHead = readFileSync(join(root, "codex/skills/aixcut-talking-head/SKILL.md"), "utf8");
  assert.match(talkingHead, /A-roll/i);
  assert.match(talkingHead, /A-roll[\s\S]{0,220}(caption|字幕|B-roll|Motion Graph|music|音乐)/i);
});

test("talking-head guidance protects semantics before filler and keeps A-roll upstream", () => {
  const talkingHead = readFileSync(join(root, "codex/skills/aixcut-talking-head/SKILL.md"), "utf8");
  assert.match(talkingHead, /preserve list[\s\S]{0,120}negation, conditions, numbers, names/i);
  assert.match(talkingHead, /complete correct take[\s\S]{0,80}(before|then)[\s\S]{0,60}filler/i);
  assert.match(talkingHead, /A-roll[\s\S]{0,200}B-roll/i);
  // ASR 错字不是删除正确表达的理由：先改转写，不要靠删片段绕过去。
  assert.match(talkingHead, /(misheard|misrecogni)[\s\S]{0,160}(instead of|rather than|do not|don't)[\s\S]{0,100}(delet|cut)/i);
});

test("visual-effects guidance requires multi-moment evidence for motion", () => {
  const visuals = readFileSync(join(root, "codex/skills/aixcut-visual-effects/SKILL.md"), "utf8");
  assert.match(visuals, /(two|multiple|at least two)[\s\S]{0,80}(moments|samples|points)/i);
  assert.match(visuals, /single frame|one frame|still frame|单帧/i);
});

test("audio guidance preserves continuity and uses purposeful sound effects", () => {
  const timeline = readFileSync(join(root, "codex/skills/aixcut-timeline-editing/SKILL.md"), "utf8");
  const assembly = readFileSync(join(root, "codex/skills/aixcut-video-assembly/SKILL.md"), "utf8");
  const text = `${timeline}\n${assembly}`;
  assert.match(text, /跨镜头|across (?:visual )?cuts|contin(?:ue|uity) across/i);
  assert.match(text, /不要.*(?:每个镜头|每次切镜).*重启|do not restart.*(?:each shot|every cut)/i);
  assert.match(text, /短音效|sound effects?|SFX/i);
  assert.match(text, /理解|easier to understand|comprehension|explain(?:s|ing)? the (?:action|result)|meaningful feedback/i);
  assert.match(text, /同步点|sync(?:hronization)? point|event time/i);
  assert.match(text, /独立.*轨|separate.*track/i);
});

test("core guidance keeps the creative goal above mechanical tool use", () => {
  const assembly = readFileSync(join(root, "codex/skills/aixcut-video-assembly/SKILL.md"), "utf8");
  assert.match(assembly, /audience[\s\S]{0,120}(main subject|claim)/i);
  assert.match(assembly, /emotional or practical outcome/i);
  const quality = readFileSync(join(root, "codex/references/core/quality-gates.md"), "utf8");
  assert.match(quality, /工具成功[\s\S]{0,80}声画通过|tool success[\s\S]{0,80}(?:pass|quality)/i);
});
