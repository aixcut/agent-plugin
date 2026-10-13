import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const skillPath = resolve(
  process.cwd(),
  "shared/skills/aixcut-timeline-editing/SKILL.md",
);
const skill = readFileSync(skillPath, "utf8");
const pipelinePath = resolve(
  process.cwd(),
  "shared/skills/aixcut-video-assembly/references/pipeline.md",
);
const pipeline = readFileSync(pipelinePath, "utf8");
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

  it("checks automatic transcription through the source view after import settles", () => {
    expect(localMedia).toMatch(
      /use `import_status` only until each import is settled/i,
    );
    expect(localMedia).toMatch(
      /call `aixcut_read\(view="sources"\)`[\s\S]*?match the source by the returned `media_id`[\s\S]*?`transcript_status`/i,
    );
    expect(localMedia).toMatch(/wait briefly and reread `sources`/i);
    expect(localMedia).toMatch(
      /read `source_lines` only after the matching source has `transcript_status=available`/i,
    );
    expect(localMedia).not.toMatch(/poll the same `import_ids` while `transcription\.status` is `running`/i);
  });

  it("keeps the video assembly workflow on the source transcription status", () => {
    expect(pipeline).toMatch(
      /use `import_status` only until the import is settled[\s\S]*?check `transcript_status` plus `transcription_tasks`/i,
    );
    expect(pipeline).toMatch(/if transcription is pending or running, reread `sources`/i);
    expect(pipeline).not.toMatch(/optional `transcription` state/i);
  });
});
