import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const assembly = readFile("shared/skills/aixcut-video-assembly/SKILL.md");
const pipeline = readFile("shared/skills/aixcut-video-assembly/references/pipeline.md");
const voice = readFile("shared/skills/aixcut-voice/SKILL.md");
const timeline = readFile("shared/skills/aixcut-timeline-editing/SKILL.md");
const videoSync = readFile("shared/skills/aixcut-voice/references/video-sync.md");
const captions = readFile("shared/skills/aixcut-captions/SKILL.md");
const verification = readFile("shared/skills/aixcut-verification/SKILL.md");

describe("Audio intent gating guidance", () => {
  it("reads all current audio evidence before deciding whether to generate", () => {
    expect(assembly).toMatch(
      /(?:read|inspect).*Project.*(?:Timeline|timeline).*(?:source audio|audio track|existing voice|口播).*(?:music|音乐).*(?:transcript|转录)/is,
    );
    expect(pipeline).toMatch(
      /(?:read|inspect).*(?:Project|sources).*(?:timeline|Timeline).*(?:audio|voice).*(?:music|音乐).*(?:transcript|转录)/is,
    );
  });

  it("defines explicit source voice and music intent states", () => {
    for (const state of [
      "preserve-original",
      "generate-voice",
      "replace-original",
      "add-music",
      "no-music",
      "optional-music",
      "needs-clarification",
    ]) {
      expect(assembly).toContain(state);
    }
  });

  it("protects existing narration and keeps optional music off by default", () => {
    expect(assembly).toMatch(
      /existing.*(?:correct|valid).*?(?:voice|speech|narration|口播).*?(?:preserve|protect|保留)/is,
    );
    expect(assembly).toMatch(
      /(?:only|must).*generate.*(?:voice|narration).*?(?:explicit|requested|明确)/is,
    );
    expect(assembly).toMatch(
      /(?:optional|unmentioned).*music.*?(?:default|off|not add|不添加)/is,
    );
    expect(assembly).toMatch(
      /(?:music|音乐).*?(?:explicit|confirmed|requested|确认).*?(?:add|添加)/is,
    );
  });

  it("requires a real available transcript before generating captions", () => {
    expect(assembly).toMatch(/caption.*?(?:only|when).*?transcript_status\s*=\s*available/is);
    expect(pipeline).toMatch(/transcript_status\s*=\s*available.*?(?:caption|字幕)/is);
  });

  it("keeps voice, transcript, and confirmed music as conditional stages", () => {
    expect(assembly).toMatch(
      /visual.*?(?:structure|视觉).*?(?:generate-voice|replace-original).*?(?:transcript|字幕).*?(?:add-music|音乐).*?(?:review|export)/is,
    );
    expect(pipeline).toMatch(
      /visual.*?(?:structure|视觉).*?(?:conditional|only when|条件).*?(?:voice|配音).*?(?:transcript|字幕).*?(?:confirmed|确认).*?(?:music|音乐).*?(?:review|export)/is,
    );
  });

  it("reads timeline audio evidence before rendering voice", () => {
    expect(voice).toMatch(/before.*render.*read.*timeline/is);
    expect(voice).toMatch(/(?:audio track|audio tracks)/is);
    expect(voice).toMatch(/source.*transcript|transcript.*source/is);
    expect(voice).toMatch(/existing voice|已有.*(?:voice|口播|配音)/is);
  });

  it("requires the bound Project page for voice rendering, while allowing script edits without it", () => {
    expect(voice).toMatch(/voice rendering.*(?:requires|需要).*?(?:target Project page|项目页).*?(?:open|online|打开|在线)/is);
    expect(voice).toMatch(/script.*settings.*(?:do not|无需|不需要).*?(?:Project page|项目页)/is);
  });

  it("keeps render and placement scoped to explicit new or replacement voice intent", () => {
    expect(voice).toMatch(/render.*(?:only|仅).*?(?:generate|bind|link).*?(?:AI|generated).*audio/is);
    expect(voice).toMatch(/(?:does not|never|不).*?(?:replace|替换).*?(?:original|source).*?(?:audio|voice)/is);
    expect(voice).toMatch(/(?:only|仅).*?(?:explicit|requested|明确).*?(?:new voice|new narration|replace|配音|替换)/is);
  });

  it("reuses correct source narration for edit-only requests", () => {
    expect(voice).toMatch(/existing.*?(?:correct|valid).*?(?:voice|speech|narration|口播).*?(?:reuse|preserve|skip.*render|复用|保留)/is);
    expect(voice).toMatch(/(?:edit|剪辑|visual|timeline).*?(?:alone|only|仅).*?(?:no|without|skip).*?(?:voice|render|synthes|配音)/is);
  });

  it("separates audio roles and confirms track and range before writes", () => {
    expect(timeline).toMatch(/(?:original|source).*?(?:voice|audio).*?(?:AI|generated).*?(?:voice|narration).*?(?:BGM|music).*?(?:SFX|sound effect)/is);
    expect(timeline).toMatch(/(?:separate|dedicated).*?(?:track|tracks).*?(?:voice|music|SFX|sound effect)/is);
    expect(timeline).toMatch(/(?:confirm|inspect|read).*?(?:track|range|start|end).*?(?:before|prior).*?(?:write|add|place)/is);
    expect(timeline).toMatch(/(?:double|duplicate).*?(?:voice|narration|speech)|双重.*?(?:人声|口播)/is);
  });

  it("only adds confirmed music with fades and narration ducking", () => {
    expect(timeline).toMatch(/(?:music|BGM).*?(?:only|仅).*?(?:enabled|confirmed|requested|启用|确认)/is);
    expect(timeline).toMatch(/(?:fade.?in|淡入).*?(?:fade.?out|淡出)/is);
    expect(timeline).toMatch(/(?:volume|音量).*?(?:0\.2|0\.3|0\.4|lower|duck|降音量).*?(?:voice|narration|speech|人声)/is);
  });

  it("chooses a voice timing anchor and protects original sound", () => {
    expect(videoSync).toMatch(/(?:timing|声音).*?(?:anchor|锚点)/is);
    expect(videoSync).toMatch(/(?:original|source).*?(?:audio|sound|声音).*?(?:protect|preserve|保留|保护)/is);
    expect(videoSync).toMatch(/(?:visual|voiceover|narration).*?(?:anchor|锚点)/is);
  });

  it("keeps captions limited to spoken or user-supplied subtitle copy", () => {
    expect(captions).toMatch(
      /caption(?: track|s)? .*?(?:only|limited|仅).*?(?:spoken|user-supplied|subtitle).*(?:copy|text|字幕)/is,
    );
    expect(captions).toMatch(
      /(?:ingredient labels?|食材标签|arrows?|箭头|titles?|标题|(?:dashed|dotted) circles?|虚线圆圈|Motion Graphs?).*?(?:separate|dedicated|not).*?(?:track|caption|字幕)/is,
    );
  });

  it("requires immediate read-back of every affected view after each structural batch", () => {
    expect(verification).toMatch(
      /after each atomic batch.*?(?:immediately|immediate).*?(?:read back|reread).*?(?:timeline).*?(?:audio|voice).*?(?:captions?)/is,
    );
  });

  it("reports final review dimensions separately", () => {
    for (const dimension of [
      "structure",
      "transcript",
      "voice roles",
      "captions",
      "visual annotations",
      "double human voice",
    ]) {
      expect(verification).toMatch(new RegExp(dimension, "i"));
    }
    expect(verification).toMatch(/final review.*?(?:separately|separate).*?(?:report|reports)/is);
  });

  it("keeps verification read-only and hands visual fixes back to editing", () => {
    expect(verification).toMatch(/verification is read-only/i);
    expect(verification).toMatch(/return.*(?:editing|edit).*capture again|交还.*编辑.*重新截帧/i);
    expect(verification).not.toMatch(/fix the position and capture again/i);
  });

  it("does not treat a passing review as proof of full playback or listening", () => {
    expect(verification).toMatch(
      /(?:passing|passed|successful).*?review.*?(?:does not|cannot|not).*?(?:prove|mean).*?(?:full playback|listening)/is,
    );
    expect(verification).toMatch(/full playback\/listening not verified/is);
  });
});
