import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readFile = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const readSkill = (name: string) => readFile(`shared/skills/${name}/SKILL.md`);

const basics = readSkill("aixcut-basics");
const timeline = readSkill("aixcut-timeline-editing");
const verification = readSkill("aixcut-verification");
const captions = readSkill("aixcut-captions");
const pipeline = readFile(
  "shared/skills/aixcut-video-assembly/references/pipeline.md",
);

describe("Editing efficiency guidance", () => {
  it("reuses read evidence while the Project and timeline are unchanged", () => {
    expect(basics).toMatch(/reuse .{0,80}(?:evidence|read)/is);
    expect(basics).toMatch(
      /(?:re-?read|refresh) .{0,120}(?:after|when) .{0,120}(?:write|warning|conflict|external change)/is,
    );
  });

  it("keeps independent reads parallel and structural writes serial", () => {
    expect(basics).toMatch(
      /(?:independent|separate) .{0,40}read .{0,80}(?:parallel|concurrent)/is,
    );
    expect(basics).toMatch(
      /structural writes? .{0,80}(?:same timeline|one timeline).{0,60}(?:serial|one at a time|not concurrently)/is,
    );
  });

  it("groups same-action writes into one call", () => {
    expect(basics).toMatch(
      /(?:group|batch) .{0,100}(?:same action|same track).{0,140}(?:one call|single call)/is,
    );
    expect(timeline).toMatch(
      /(?:one call|single call).{0,160}`?items\[\]`?|`items\[\]`.{0,160}(?:one call|single call)/is,
    );
    expect(timeline).toMatch(
      /(?:never|do not|don't) .{0,80}(?:one call per|call per|per clip|per label|per segment)/is,
    );
  });

  it("forbids inventing batch shapes the live schema does not support", () => {
    expect(basics).toMatch(
      /(?:live|current) (?:Tool )?Schema .{0,100}(?:only|decides|supports)/is,
    );
    expect(timeline).toMatch(
      /(?:never|do not|don't) .{0,80}(?:merge|combine|mix) .{0,100}(?:actions|tracks|domains)/is,
    );
  });

  it("reads back after each atomic batch instead of every single write", () => {
    expect(verification).toMatch(
      /after each atomic batch .{0,100}(?:read back|reread).{0,100}(?:affected|timeline|audio|captions)/is,
    );
    expect(pipeline).toMatch(
      /after every atomic batch .{0,100}(?:reread|read back) .{0,100}(?:timeline|audio|captions)/is,
    );
  });

  it("keeps per-dimension final verification", () => {
    expect(verification).toMatch(/final review .{0,100}(?:separately|separate)/is);
    expect(verification).toMatch(
      /(?:each write|every write) .{0,140}verification/is,
    );
  });

  it("does not regenerate captions that are already derived and still valid", () => {
    expect(captions).toMatch(
      /(?:do not|never) .{0,80}regenerate .{0,160}(?:already|unchanged|still valid|still matches|current)/is,
    );
    expect(captions).toMatch(
      /manual .{0,100}(?:protect|preserve|not replace|overwrite)/is,
    );
  });

  it("captures several frames per call and skips frames for non-visual changes", () => {
    expect(verification).toMatch(/Capture 1–8 frames in one call/i);
    expect(verification).toMatch(
      /do not capture frames for .{0,120}(?:timing-only|volume|fades)/is,
    );
  });
});
