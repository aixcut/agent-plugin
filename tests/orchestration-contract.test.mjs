import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = new URL("../", import.meta.url).pathname;
const hosts = ["codex", "openai"];
const sharedSkills = [
  "aixcut-basics",
  "aixcut-captions",
  "aixcut-documents",
  "aixcut-export",
  "aixcut-generation",
  "aixcut-known-errors",
  "aixcut-login",
  "aixcut-mcp-logout",
  "aixcut-projects",
  "aixcut-talking-head",
  "aixcut-timeline-editing",
  "aixcut-verification",
  "aixcut-video-assembly",
  "aixcut-visual-effects",
  "aixcut-voice",
];

const read = (...parts) => readFileSync(join(root, ...parts), "utf8");

const requiresGraph = (host) => {
  const map = JSON.parse(read(host, "contracts/skill-tool-map.json"));
  return new Map(map.skills.map((entry) => [entry.skill, entry.requires ?? []]));
};

const findCycle = (graph) => {
  const visiting = new Set();
  const visited = new Set();
  const visit = (name, path) => {
    if (visiting.has(name)) return [...path, name];
    if (visited.has(name)) return null;
    visiting.add(name);
    for (const dependency of graph.get(name) ?? []) {
      const cycle = visit(dependency, [...path, name]);
      if (cycle) return cycle;
    }
    visiting.delete(name);
    visited.add(name);
    return null;
  };
  for (const name of graph.keys()) {
    const cycle = visit(name, []);
    if (cycle) return cycle;
  }
  return null;
};

const reachesBasics = (graph, name, seen = new Set()) => {
  if (name === "aixcut-basics") return true;
  if (seen.has(name)) return false;
  seen.add(name);
  return (graph.get(name) ?? []).some((dependency) => reachesBasics(graph, dependency, seen));
};

for (const host of hosts) {
  test(`${host}: basics is the mandatory orchestration entry`, () => {
    const basics = read(host, "skills/aixcut-basics/SKILL.md");
    assert.match(basics, /Mandatory entry for every Aixcut task/i);
    assert.match(basics, /一?个 AixCut 任务中先加载|Load(?: this Skill)? before any (?:Aix(?:cut|Cut) )?(?:MCP call|task)/i);
    assert.match(basics, /intent-routing\.md/);
    assert.doesNotMatch(basics, /Load as fallback/i);
  });

  test(`${host}: routing reference defines the six modes and guard mapping`, () => {
    const path = join(root, host, "skills/aixcut-basics/references/intent-routing.md");
    assert.equal(existsSync(path), true, `${host}: missing intent-routing.md`);
    const routing = readFileSync(path, "utf8");
    for (const mode of [
      "inspect_only",
      "mechanical",
      "local_edit",
      "talking_head",
      "full_assembly",
      "focused_task",
    ]) assert.match(routing, new RegExp(`\\b${mode}\\b`));
    assert.match(routing, /plan_context\.mode[\s\S]*mechanical[\s\S]*local_edit[\s\S]*full_assembly/i);
    assert.match(routing, /single writer|one writer|单写者|唯一写者/i);
    assert.match(routing, /read[- ]only[\s\S]{0,240}subagent|subagent[\s\S]{0,240}read[- ]only|子\s*Agent[\s\S]{0,120}只读/i);
    assert.match(routing, /at most three|最多三个/i);
  });

  test(`${host}: every shared Skill is reachable from basics and has no dependency cycle`, () => {
    const graph = requiresGraph(host);
    for (const skill of sharedSkills) assert.ok(graph.has(skill), `${host}: missing ${skill}`);
    assert.equal(findCycle(graph), null, `${host}: dependency cycle ${JSON.stringify(findCycle(graph))}`);
    for (const skill of sharedSkills) {
      assert.equal(reachesBasics(graph, skill), true, `${host}: ${skill} is not reachable from basics`);
    }
  });
}

test("codex and openai expose the same Skill dependency graph", () => {
  const normalize = (host) => Object.fromEntries(
    [...requiresGraph(host)].sort(([left], [right]) => left.localeCompare(right)),
  );
  assert.deepEqual(normalize("codex"), normalize("openai"));
});
