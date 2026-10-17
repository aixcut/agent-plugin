import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateSkillClosure } from "../../scripts/skill-contract-closure.mjs";

const catalog = {
  tools: [
    { name: "aixcut_read", actions: ["speech", "timeline", "mutation_receipt"] },
    { name: "aixcut_generate", actions: ["catalog", "speech_read", "speech_edit", "speech_quote", "speech_submit", "get"] },
  ],
};

function fixture(text: string, references: string[] = []) {
  const root = mkdtempSync(join(tmpdir(), "aixcut-closure-"));
  mkdirSync(join(root, "shared/skills/aixcut-voice/references"), { recursive: true });
  writeFileSync(join(root, "shared/skills/aixcut-voice/SKILL.md"), text);
  const mapping = { skills: [{ skill: "aixcut-voice", requires: [], tools: { required: ["aixcut_read", "aixcut_generate"], optional: [], forbidden: [] }, references }] };
  return { root, mapping, run: () => validateSkillClosure({ root, mapping, catalog }) };
}

function check(text: string, assertion: (run: () => Promise<unknown>) => Promise<void>) {
  const data = fixture(text);
  return assertion(data.run).finally(() => rmSync(data.root, { recursive: true, force: true }));
}

describe("Skill Tool/action/view closure", () => {
  it.each([
    ['Call `aixcut_voice(action="render")`.', "aixcut_voice"],
    ['Call `aixcut_read(view="voice")`.', "voice"],
    ['Call `aixcut_generate(action="voice")`.', "voice"],
  ])("rejects a callable removed contract: %s", async (text, expected) => {
    await check(text, async (run) => { await expect(run()).rejects.toThrow(expected); });
  });

  it("ignores explicit historical and negative examples", async () => {
    await check('Do not call `aixcut_voice(action="render")`.\nHistorical: `aixcut_read(view="voice")` was removed.\n```json aixcut_generate invalid-example\n{"action":"execute"}\n```', async (run) => { await expect(run()).resolves.toBeDefined(); });
  });

  it("checks unknown actions in structured JSON examples inside references", async () => {
    const data = fixture("See the action reference.", ["references/actions.md"]);
    writeFileSync(join(data.root, "shared/skills/aixcut-voice/references/actions.md"), '```json aixcut_generate\n{"action":"execute"}\n```');
    try { await expect(data.run()).rejects.toThrow("execute"); }
    finally { rmSync(data.root, { recursive: true, force: true }); }
  });

  it("rejects undeclared and forbidden calls even when the catalog contains them", async () => {
    const data = fixture('Call `aixcut_generate(action="speech_read")`.');
    data.mapping.skills[0].tools.required = ["aixcut_read"];
    data.mapping.skills[0].tools.forbidden = ["aixcut_generate"];
    try { await expect(data.run()).rejects.toThrow(/forbidden|undeclared/i); }
    finally { rmSync(data.root, { recursive: true, force: true }); }
  });

  it("accepts structured legal speech calls and distinct read views", async () => {
    await check('Call `aixcut_read(view="speech")`.\n```json aixcut_generate\n{"action":"speech_quote","all":true}\n```', async (run) => { await expect(run()).resolves.toMatchObject({ skills: 1 }); });
  });

  it("rejects positive prose references to removed Tools", async () => {
    await check("Use `aixcut_voice` to create the audio.", async (run) => { await expect(run()).rejects.toThrow("aixcut_voice"); });
  });

  it("rejects a removed action listed only in a reference table", async () => {
    await check("| aixcut_generate | execute | Wait |", async (run) => { await expect(run()).rejects.toThrow("execute"); });
  });

  it("rejects a view selector passed to an action Tool", async () => {
    await check('```json aixcut_generate\n{"view":"speech_read"}\n```', async (run) => { await expect(run()).rejects.toThrow(/selector|action/i); });
  });

  it("checks shorthand action calls against their own Tool", async () => {
    await check('Call `aixcut_generate(timeline)`.', async (run) => { await expect(run()).rejects.toThrow("aixcut_generate.timeline"); });
  });

  it("does not hide a positive call because its sentence later says never", async () => {
    await check('Call `aixcut_generate(action="execute")`; never resubmit the job.', async (run) => { await expect(run()).rejects.toThrow("execute"); });
  });

  it("scans unlisted reference documents", async () => {
    const data = fixture("A voice workflow.");
    writeFileSync(join(data.root, "shared/skills/aixcut-voice/references/unlisted.md"), 'Call `aixcut_generate(action="execute")`.');
    try { await expect(data.run()).rejects.toThrow("execute"); }
    finally { rmSync(data.root, { recursive: true, force: true }); }
  });

  it("rejects references that escape the packaged skill", async () => {
    const data = fixture("Reference", ["references/outside.md"]);
    const outside = join(data.root, "outside.md");
    writeFileSync(outside, "outside");
    symlinkSync(outside, join(data.root, "shared/skills/aixcut-voice/references/outside.md"));
    try { await expect(data.run()).rejects.toThrow(/escape|outside/i); }
    finally { rmSync(data.root, { recursive: true, force: true }); }
  });

  it("closes the real Skills and references against the live server action snapshot", async () => {
    const snapshot = JSON.parse(readFileSync("../aixcut-mcp-server/contracts/tools.snapshot.json", "utf8"));
    const live = { tools: Object.entries(snapshot).map(([name, actions]) => ({ name, actions: Object.keys(actions as object) })) };
    live.tools.push({ name: "aixcut_login", actions: [] }, { name: "aixcut_logout", actions: [] }, { name: "aixcut_exit_project", actions: [] });
    await expect(validateSkillClosure({ root: process.cwd(), catalog: live })).resolves.toMatchObject({ skills: 14 });
  });

  it("has no positive legacy voice Tool or voice view in the shared source", async () => {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("rg", ["-n", "aixcut_voice|view=\\\"voice\\\"", "shared/skills"], { encoding: "utf8" });
    expect(result.status).toBe(1);
    expect(result.stdout.trim()).toBe("");
  });
});
