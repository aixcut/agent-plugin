import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const actions = read("shared/skills/aixcut-timeline-editing/references/actions.md");
const timelineSkill = read("shared/skills/aixcut-timeline-editing/SKILL.md");
const captions = read("shared/skills/aixcut-captions/references/actions.md");
const model = read("shared/skills/aixcut-basics/references/model.md");
const host = read("shared/skills/aixcut-basics/references/workflow-host.md");
const documents = read("shared/skills/aixcut-documents/SKILL.md");
const generation = read("shared/skills/aixcut-generation/references/providers.md");
const verification = read("shared/skills/aixcut-verification/SKILL.md");
const reviewActions = read("shared/skills/aixcut-verification/references/actions.md");
const errors = read("shared/skills/aixcut-known-errors/SKILL.md");
const catalog = JSON.parse(read("contracts/mcp-tool-catalog.json")) as {
  tools: Array<{ name: string; actions: string[] }>;
};

describe("Aixcut Skill bug report remediation contract", () => {
  it("marks every plan-guard-protected mutation as requiring plan_context", () => {
    const required = [
      ["aixcut_primary", "set"], ["aixcut_primary", "replace"], ["aixcut_primary", "delete"],
      ["aixcut_speech", "set"], ["aixcut_speech", "replace"], ["aixcut_speech", "delete"], ["aixcut_speech", "reset"],
      ["aixcut_clip", "replace"], ["aixcut_clip", "delete"],
      ["aixcut_audio", "replace"], ["aixcut_audio", "delete"],
      ["aixcut_caption", "set"], ["aixcut_caption", "regenerate"], ["aixcut_caption", "delete"],
      ["aixcut_text", "delete"], ["aixcut_track", "clear"], ["aixcut_track", "delete"],
      ["aixcut_project", "clear"],
    ];
    for (const [tool, action] of required) {
      const table = tool === "aixcut_caption" ? captions : actions;
      const rows = table.split("\n").filter((line) => line.startsWith("| aixcut_"));
      const row = rows.find((line) => line.startsWith(`| ${tool} | ${action} |`));
      expect(row, `${tool}.${action} action-table row`).toBeDefined();
      expect(row!.split("|")[3], `${tool}.${action} required fields`).toContain("plan_context");
    }
    expect(host).toMatch(/plan_context[\s\S]*authorized_actions/);
  });

  it("defines how callers should consume ref_map without relying on unstable keys", () => {
    expect(model).toMatch(/ref_map/i);
    expect(model).toMatch(/new:N/);
    expect(model).toMatch(/stable.*(?:value|ref)|(?:value|ref).*stable/i);
    expect(model).toMatch(/rename/i);
    expect(model).toMatch(/split/i);
  });

  it("documents editing actions, field semantics, and destructive effects", () => {
    expect(actions).toMatch(/\| aixcut_audio \| fade \|/);
    expect(actions).toMatch(/MCP_TRACK_LOCKED/);
    expect(actions).toMatch(/kind.*video.*audio.*text.*motion-graph.*graphic.*effect.*composition/is);
    expect(actions).toMatch(/role.*(?:open|free-form|not.*closed|extensible)/is);
    expect(actions).toMatch(/generic/);
    expect(actions).toMatch(/caption/);
    expect(actions).toMatch(/main video track[\s\S]*delete|delete[\s\S]*main video track/i);
    expect(actions).toMatch(/speech.*delete.*(?:main timeline|timeline clip)/is);
    expect(timelineSkill).toMatch(/--no-reuse/);
    for (const tool of ["aixcut_clip", "aixcut_text", "aixcut_caption", "aixcut_audio"]) {
      const table = tool === "aixcut_caption" ? captions : actions;
      expect(table).toMatch(new RegExp(`\\| ${tool} \\| split \\|[^\\n]*at least one of [^\\n]*(?:at_ms|char_index|to_ms)`, "i"));
    }
    expect(captions).toMatch(/highlightRanges[\s\S]{0,120}(?:not|does not).*remap|(?:not|does not).*remap[\s\S]{0,120}highlightRanges/i);
  });

  it("documents generation catalog defaults and the supported media kinds", () => {
    expect(generation).toMatch(/\| aixcut_generate \| catalog \|/);
    expect(generation).toMatch(/kind.*default.*speech/is);
    for (const kind of ["image", "video", "music", "speech"])
      expect(generation).toContain(`\`${kind}\``);
  });

  it("documents the full frontend action catalog and review contract", () => {
    const frontend = catalog.tools.find((tool) => tool.name === "aixcut_frontend");
    expect(frontend).toBeDefined();
    const reference = read("shared/skills/aixcut-timeline-editing/references/frontend-actions.md");
    for (const action of frontend!.actions) expect(reference, action).toContain(`\`${action}\``);
    expect(reference).toMatch(/operation\.get[\s\S]*operation_id/);
    expect(reference).toMatch(/media\.list[\s\S]*expected_file_revision/);
    expect(documents).toMatch(/prompt_add_document/);
    expect(documents).toMatch(/list_documents/);
    expect(verification).toMatch(/aixcut_review[\s\S]*renderability/);
    expect(reviewActions).toMatch(/renderable[\s\S]*summary[\s\S]*issues/);
    expect(reviewActions).toMatch(/does not simulate an export|does not prove/i);
  });

  it("describes caption mode transitions and split limitations truthfully", () => {
    expect(captions).toMatch(/mode.{0,100}(?:flag|follow|tracking|switch)/is);
    expect(captions).toMatch(/regenerate[\s\S]*transcript_status=available/is);
    expect(captions).toMatch(/set.*add.*manual/is);
    expect(captions).toMatch(/highlightRanges.*(?:not|does not).*remap|(?:not|does not).*remap.*highlightRanges/is);
    expect(captions).not.toMatch(/mode="auto"[^\n]*(?:rebuilds? the entire track|overwrites manual)/i);
  });

  it("lists the plan-required and caption-transcript recovery errors", () => {
    expect(errors).toMatch(/MCP_PLAN_REQUIRED[\s\S]*plan_context/i);
    expect(errors).toContain("MCP_CAPTION_TRANSCRIPT_EMPTY");
    for (const code of [
      "MCP_PLAN_REQUIRED",
      "MCP_PLAN_REVISION_STALE",
      "MCP_PLAN_SCOPE_CONFLICT",
      "MCP_PLAN_ACTION_UNAUTHORIZED",
    ])
      expect(catalog.error_codes, `${code} is in the pinned Core catalog`).toContain(code);
  });
});
