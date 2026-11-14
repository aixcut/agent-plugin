import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  classifyTraceTool,
  normalizePublishedCall,
  normalizeMcpE2eTrace,
  TRACE_TOOL_POLICY,
} from "../codex/scripts/workflow-trace-adapter.mjs";
import { evaluateWorkflow } from "../codex/scripts/workflow-evaluation.mjs";

const catalog = JSON.parse(
  readFileSync(new URL("../codex/contracts/mcp-tool-catalog.json", import.meta.url), "utf8"),
);

test("every published tool has an explicit trace policy", () => {
  assert.deepEqual(
    Object.keys(TRACE_TOOL_POLICY).sort(),
    catalog.tools.map((tool) => tool.name).sort(),
  );
  for (const tool of catalog.tools) {
    const purpose = classifyTraceTool(tool.name, { action: tool.actions?.[0] });
    assert.ok(["read", "control", "mutation", "billable"].includes(purpose), `${tool.name}: ${purpose}`);
  }
});

test("newly added editing tools are not silently omitted from mutation accounting", () => {
  for (const [tool, action, expected] of [
    ["aixcut_layout", "set", "mutation"],
    ["aixcut_style", "set", "mutation"],
    ["aixcut_arrange", "move", "mutation"],
    ["aixcut_effect", "add", "mutation"],
    ["aixcut_transition", "add", "mutation"],
    ["aixcut_mask", "add", "mutation"],
    ["aixcut_keyframe", "add", "mutation"],
    ["aixcut_export", "submit", "billable"],
    ["aixcut_export", "get", "read"],
    ["aixcut_media", "prepare_upload", "mutation"],
    ["aixcut_media", "upload_status", "read"],
  ]) {
    assert.equal(classifyTraceTool(tool, { action }), expected, `${tool}.${action}`);
  }
  for (const tool of [
    "aixcut_layout",
    "aixcut_style",
    "aixcut_arrange",
    "aixcut_effect",
    "aixcut_transition",
    "aixcut_mask",
    "aixcut_keyframe",
  ]) {
    assert.match(classifyTraceTool(tool, {}), /^(mutation|billable)$/, tool);
  }
});

test("legacy per-action tool names normalize to their published parent", () => {
  assert.deepEqual(
    normalizePublishedCall("aixcut_frontend_capture_timeline_frames", {}),
    { tool: "aixcut_frontend", args: { action: "capture_timeline_frames" }, action: "capture_timeline_frames" },
  );
});

const rawTrace = {
  events: [
    {
      kind: "tool:start",
      requestId: "1",
      tool: "aixcut_effect",
      arguments: { action: "add", idempotency_key: "11111111-1111-4111-8111-111111111111" },
    },
    {
      kind: "tool:end",
      requestId: "1",
      tool: "aixcut_effect",
      envelope: { status: "ok", result: { mutation_id: "11111111-1111-4111-8111-111111111111" } },
    },
  ],
};

test("same-key identical replay is distinguished from an unexpected duplicate", () => {
  const trace = normalizeMcpE2eTrace(rawTrace, { scenario: "replay" });
  const mutation = trace.events.find((event) => event.type === "mutation");
  assert.equal(mutation.idempotent_replay, false);

  const replay = {
    events: [
      ...rawTrace.events,
      { ...rawTrace.events[0], requestId: "2" },
      { ...rawTrace.events[1], requestId: "2" },
    ],
  };
  const replayTrace = normalizeMcpE2eTrace(replay, { scenario: "replay" });
  const events = replayTrace.events.filter((event) => event.type === "mutation");
  assert.equal(events[1].idempotent_replay, true);
  assert.equal(evaluateWorkflow(replayTrace).metrics.duplicate_mutations, 0);
});
