import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (skill: string) => readFileSync(`shared/skills/${skill}/SKILL.md`, "utf8");

describe("Codex intent, recovery and evidence workflow", () => {
  it("distinguishes bounded playback process evidence from listening quality", () => {
    const verification = read("aixcut-verification");
    expect(verification).toContain('playback_check');
    expect(verification).toMatch(/playback_check.*timeline_id.*expected_revision/s);
    expect(verification).toMatch(/audio_review.*unjudgeable/s);
  });
  it("uses packaged executable recovery and delivery gates with a host-owned directory", () => {
    const basics = read("aixcut-basics");
    expect(basics).toContain("workflow-host.mjs");
    expect(basics).toMatch(/save --directory/);
    expect(basics).toMatch(/resume --directory/);
    expect(basics).toMatch(/host_storage_unavailable|persisted: false/);
    expect(read("aixcut-verification")).toMatch(/workflow-host.mjs.*gate/s);
    expect(read("aixcut-export")).toMatch(/gate.*deliverable.*export/s);
    expect(read("aixcut-export")).toMatch(/expected_revision/);
  });
  it("keeps mechanical edits narrow and resumes unknown writes through a receipt", () => {
    const basics = read("aixcut-basics");
    expect(basics).toContain("intent → inspect → plan → execute → verify → deliver");
    expect(basics).toMatch(/mechanical.*(?:voice|music).*export/is);
    expect(basics).toMatch(/status_unknown.*mutation_receipt/is);
    expect(basics).not.toMatch(/status_unknown.{0,40}retry original parameters/is);
    expect(basics).toMatch(/Checkpoint.*(?:revision|identity)/is);
  });

  it("routes complete assembly through evidence-backed shot planning and explicit export intent", () => {
    const assembly = read("aixcut-video-assembly");
    for (const artifact of ["EditPlan", "ShotPlan", "Checkpoint", "ReviewEvidence"]) expect(assembly).toContain(artifact);
    expect(assembly).toMatch(/export.*(?:explicit|requested|authorized)/is);
    expect(assembly).toMatch(/transcript.*(?:interrupted|unknown).*recover/is);
  });

  it("tracks generation recovery and tests four independent delivery dimensions", () => {
    const generation = read("aixcut-generation");
    expect(generation).toMatch(/submission_unknown.*(?:same|original).*identity/is);
    expect(generation).toMatch(/(?:brief|anchor).*reference/is);
    const verification = read("aixcut-verification");
    for (const dimension of ["structure", "semantic", "visual", "audio"]) expect(verification).toContain(dimension);
    expect(verification).toMatch(/pass.*fail.*unjudgeable/is);
    expect(verification).toMatch(/composed frame/is);
    expect(verification).toMatch(/listening.*unjudgeable/is);
  });

  it("requires visual evidence whenever timing changes alter the visible composition", () => {
    const verification = read("aixcut-verification");
    expect(verification).toMatch(/skip.*only when.*visible composition (?:is )?unchanged/is);
    expect(verification).toMatch(/trim.*split.*move.*speed.*(?:visible|composition)/is);
    expect(verification).toMatch(/volume.*fade.*audio.*(?:evidence|unjudgeable)/is);
    expect(verification).not.toMatch(/Do not capture frames for timing-only edits \(trim, split, move, speed\), volume, fades, caption wording, or track add\/remove\)/i);
  });

  it("makes unknown-error recovery read-only and budgets repeated fixes", () => {
    const errors = read("aixcut-known-errors");
    expect(errors).toMatch(/MCP_MUTATION_STATUS_UNKNOWN.*mutation_receipt/is);
    expect(errors).not.toMatch(/MCP_MUTATION_STATUS_UNKNOWN[^\n]*Retry with the exact original parameters/i);
    expect(read("aixcut-basics")).toMatch(/(?:one|1) schema correction.*(?:two|2) revision/is);
    expect(read("aixcut-generation")).toMatch(/two failed|2 failed|two attempts/i);
  });

  it("preserves semantic units and natural speech rather than cutting all silence", () => {
    const talking = read("aixcut-talking-head");
    expect(talking).toMatch(/semantic units?.*negation.*condition.*(?:number|numeric)/is);
    expect(talking).toMatch(/retake.*(?:correct|best)/is);
    expect(talking).toMatch(/breath.*(?:seam|join)/is);
    expect(talking).toMatch(/optional.*(?:B-roll|music).*off/is);
  });
});
