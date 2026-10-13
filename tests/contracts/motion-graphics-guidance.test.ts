import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSkill = (name: string) =>
  readFileSync(resolve(process.cwd(), `shared/skills/${name}/SKILL.md`), "utf8");

const timeline = readSkill("aixcut-timeline-editing");
const assembly = readSkill("aixcut-video-assembly");
const captions = readSkill("aixcut-captions");

describe("Motion Graph track isolation guidance", () => {
  it("routes annotations through explicit tracks and verifies placement", () => {
    expect(timeline).toMatch(/aixcut_track.*ensure.*(?:overlay|art-text)/is);
    expect(timeline).toMatch(/explicit(?:ly)? pass.*track ref|explicit track ref/is);
    expect(timeline).toMatch(/aixcut_clip.*kind.*motion-graph.*(?:overlay|video)/is);
    expect(timeline).toMatch(/read.*timeline.*(?:after|immediately).*write/is);
    expect(timeline).toMatch(/wrong.*track.*(?:move|correct).*never.*delete/is);
  });

  it("keeps caption generation independent from visual annotations", () => {
    expect(assembly).toMatch(/visual annotations.*(?:stage|step).*before.*caption/is);
    expect(assembly).toMatch(/verify.*(?:captions|subtitle).*and.*(?:annotations|Motion Graph)/is);
    expect(captions).toMatch(/caption(?:s)? .*only.*(?:spoken|subtitle).*visual annotations/is);
    expect(captions).toMatch(/caption.*(?:no|without).*Motion Graph.*(?:art-text|annotation)/is);
  });

  it("does not permit Motion Graphs to fall back to text or captions", () => {
    expect(timeline).not.toMatch(/Motion Graphs?.*(?:use|route|fall back to).*`aixcut_text`/i);
    expect(timeline).not.toMatch(/delete.*(?:Motion Graph|annotation).*continue/i);
  });
});
