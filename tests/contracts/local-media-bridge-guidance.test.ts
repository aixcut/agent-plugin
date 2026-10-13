import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const skillPath = resolve(
  process.cwd(),
  "shared/skills/aixcut-timeline-editing/SKILL.md",
);
const skill = readFileSync(skillPath, "utf8");
const localMediaStart = skill.indexOf("## Local media");
const capturesStart = skill.indexOf("## Captures", localMediaStart);
const localMedia = skill.slice(localMediaStart, capturesStart);

describe("local media bridge guidance", () => {
  it("checks bridge readiness and recovers before offering manual upload", () => {
    expect(localMedia).toMatch(
      /start or reuse the bridge yourself before importing; do not ask the user to start it/i,
    );
    const readiness = localMedia.indexOf("The helper checks an existing bridge's health");
    const importGate = localMedia.indexOf(
      'Do not call `aixcut_frontend(action="import_local_media")` until this command succeeds.',
    );
    expect(readiness).toBeGreaterThanOrEqual(0);
    expect(importGate).toBeGreaterThan(readiness);
    expect(localMedia).toMatch(/Do not call .*import_local_media.*until.*ready/is);
    expect(localMedia).toMatch(/If the helper command fails.*inspect.*(?:error|log)/is);
    expect(localMedia).toMatch(/retry.*once/is);
    expect(localMedia).toMatch(/Offer manual upload only after.*(?:retry|recovery)/is);
    expect(localMedia).toMatch(/Do not ask the user to start the bridge.*after the first failure/is);
    expect(localMedia).not.toMatch(/If all URLs fail, ask the user to use the manual upload path/i);
    expect(localMedia).not.toMatch(
      /If the bridge is unreachable, rerun it for a fresh URL or use the manual upload path/i,
    );
  });

  it("tracks automatic transcription separately from import readiness", () => {
    expect(localMedia).toMatch(/`import_status`[\s\S]*?`transcription`/i);
    expect(localMedia).toMatch(
      /poll the same `import_ids` while `transcription\.status` is `running`/i,
    );
    expect(localMedia).toMatch(
      /read `source_lines` only after the matching source has `transcript_status=available`/i,
    );
  });
});
