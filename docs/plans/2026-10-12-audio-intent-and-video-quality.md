# AIXCut 声音意图与成片质量实施方案

> **For agentic workers:** 使用 `subagent-driven-development` 按任务执行；每个任务先写契约测试并确认失败，再修改 Skill，完成后做规范审查和代码质量审查。当前仓库规则要求保留一个最终提交，未获得用户确认前不要提交或推送。

**Goal:** 让桌面 Plugin 在完整成片任务中根据原声、AI 配音和音乐意图做条件化决策，提升声画、字幕和 Motion Graph 的成片质量。

**Architecture:** 把声音意图判断放在 `aixcut-video-assembly` 的编排层；把原声保护、AI 配音生命周期和音轨约束放在 `aixcut-voice` 与 `aixcut-timeline-editing`；用契约测试锁定跨 Skill 的边界。正式源目录只改 `shared/skills`，由构建脚本生成 `codex/` 包。

**Tech Stack:** Markdown Skill 规则、Vitest 契约测试、Node.js 构建脚本。

---

### Task 1: 为完整成片增加声音意图闸门

**Files:**
- Modify: `shared/skills/aixcut-video-assembly/SKILL.md`
- Modify: `shared/skills/aixcut-video-assembly/references/pipeline.md`
- Test: `tests/contracts/audio-intent-guidance.test.ts`

- [ ] **Step 1: 写失败测试**

在 `tests/contracts/audio-intent-guidance.test.ts` 增加断言：

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readSkill = (name: string) =>
  readFileSync(resolve(process.cwd(), `shared/skills/${name}/SKILL.md`), "utf8");

const assembly = readSkill("aixcut-video-assembly");

describe("Audio intent gating guidance", () => {
  it("protects existing source audio before creating AI voice", () => {
    expect(assembly).toMatch(/read.*(?:source audio|timeline|audio track)/is);
    expect(assembly).toMatch(/existing.*(?:speech|voice|narration).*preserve/is);
    expect(assembly).toMatch(/(?:only|must).*generate.*voice.*(?:explicit|requested)/is);
  });

  it("does not auto-enable optional music", () => {
    expect(assembly).toMatch(/optional.*music.*(?:default|off|not add)/is);
    expect(assembly).toMatch(/music.*(?:explicit|confirmed).*add/is);
  });

  it("keeps music and voice conditional in the stage order", () => {
    expect(assembly).toMatch(/voice.*(?:only when|if).*intent/is);
    expect(assembly).toMatch(/background music.*(?:only when|if).*requested/is);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

运行：

```bash
npm test -- tests/contracts/audio-intent-guidance.test.ts
```

预期：失败，因为当前成片 Skill 没有把原声保护和可选音乐默认关闭写成明确规则。

- [ ] **Step 3: 修改成片 Skill**

在“动手前先对齐”之后增加“声音意图闸门”，明确读取原始音频、已有口播、已有音乐和转录状态，并使用 `preserve-original`、`generate-voice`、`replace-original`、`add-music`、`no-music`、`optional-music`、`needs-clarification` 这些状态。

把执行顺序改为条件分支：视觉结构总是执行；只有 `generate-voice` 或 `replace-original` 才进入配音；只有 `add-music` 且用户已经确认才进入音乐；字幕始终依赖真实转录。

在 `references/pipeline.md` 的 Stage 0、Stage 3、Stage 5 和 Stage 6 增加同样的条件与读回要求，避免主 Skill 与参考流程互相矛盾。

- [ ] **Step 4: 运行测试确认通过**

运行：

```bash
npm test -- tests/contracts/audio-intent-guidance.test.ts
```

预期：新增契约测试全部通过。

---

### Task 2: 强化 Voice 和音频轨道边界

**Files:**
- Modify: `shared/skills/aixcut-voice/SKILL.md`
- Modify: `shared/skills/aixcut-timeline-editing/SKILL.md`
- Modify: `shared/skills/aixcut-voice/references/video-sync.md`
- Test: `tests/contracts/audio-intent-guidance.test.ts`

- [ ] **Step 1: 扩展失败测试**

在同一测试文件中增加断言：

```ts
const voice = readSkill("aixcut-voice");
const timeline = readSkill("aixcut-timeline-editing");

it("separates rendering from source-audio replacement", () => {
  expect(voice).toMatch(/existing.*(?:source audio|speech|narration).*preserve/is);
  expect(voice).toMatch(/render.*(?:does not|must not).*replace.*(?:source|original)/is);
  expect(voice).toMatch(/place.*(?:only when|when).*requested/is);
});

it("protects original speech and mixes audio roles explicitly", () => {
  expect(timeline).toMatch(/original.*(?:speech|audio).*preserve/is);
  expect(timeline).toMatch(/voice.*music.*(?:separate|parallel).*track/is);
  expect(timeline).toMatch(/double.*(?:voice|speech)|unintended.*(?:double|overlap)/is);
});
```

- [ ] **Step 2: 运行测试确认失败**

运行同一个专项测试，确认缺少上述规则导致失败。

- [ ] **Step 3: 修改 Voice 和 Timeline 规则**

在 Voice Skill 中补充：

- 生成前先读取 Timeline、音频轨和源素材转录状态。
- `render` 只生成/绑定 AI 音频，不默认替换原始声音。
- 只有明确要求新配音或替换原声时才调用 render/place。
- 已有正确口播且用户只要求剪辑时，直接复用原音频。

在 Timeline Skill 中补充：

- 原始口播、AI 配音、BGM 和 SFX 是不同声音角色。
- 写入或替换前确认目标轨和范围，避免双重人声。
- 有人声时 BGM 只有在启用后才添加并降低音量。

在 `video-sync.md` 中补充“先判断声音锚点和原声保护，再决定是否生成 AI 配音”。

- [ ] **Step 4: 运行专项测试**

```bash
npm test -- tests/contracts/audio-intent-guidance.test.ts
```

预期：全部通过。

---

### Task 3: 锁定视觉标注、字幕和质量验收边界

**Files:**
- Modify: `shared/skills/aixcut-video-assembly/SKILL.md`
- Modify: `shared/skills/aixcut-captions/SKILL.md`
- Modify: `shared/skills/aixcut-verification/SKILL.md`
- Test: `tests/contracts/audio-intent-guidance.test.ts`
- Existing regression: `tests/contracts/motion-graphics-guidance.test.ts`

- [ ] **Step 1: 写失败测试**

增加断言：

```ts
const captions = readSkill("aixcut-captions");
const verification = readSkill("aixcut-verification");

it("keeps visual annotations out of caption tracks", () => {
  expect(assembly).toMatch(/labels.*arrows.*circles.*(?:visual annotation|Motion Graph)/is);
  expect(captions).toMatch(/caption.*only.*(?:spoken|subtitle)/is);
  expect(captions).toMatch(/(?:visual annotation|Motion Graph).*dedicated.*track/is);
});

it("requires read-back evidence for sound and visual quality", () => {
  expect(verification).toMatch(/read.*(?:timeline|audio|captions).*after.*write/is);
  expect(verification).toMatch(/(?:full playback|listening).*not verified/is);
  expect(verification).toMatch(/double.*(?:voice|speech)|audio.*overlap/is);
});
```

- [ ] **Step 2: 运行测试确认失败**

运行专项测试和现有 Motion Graph 契约测试，确认新增质量断言缺失。

- [ ] **Step 3: 修改规则**

补充：

- 标签、箭头、虚线圆圈归入 `art-text` 或 Motion Graph，不允许进入 Caption。
- 每次结构写入后立即重新读取受影响视图。
- 结构 review 通过不等于完整播放/试听通过。
- 最终自检必须分别报告原声、AI 配音、字幕、音乐、视觉标注和双重人声风险。

- [ ] **Step 4: 运行专项测试**

```bash
npm test -- tests/contracts/audio-intent-guidance.test.ts tests/contracts/motion-graphics-guidance.test.ts
```

预期：新增和既有契约测试全部通过。

---

### Task 4: 构建包、执行最终验证并审查差异

**Files:**
- Generated: `codex/skills/**`
- Generated: `codex/.codex-plugin/**`（如构建脚本涉及）
- Verify: `git diff --check`

- [ ] **Step 1: 运行专项契约测试**

```bash
npm test -- tests/contracts/audio-intent-guidance.test.ts tests/contracts/motion-graphics-guidance.test.ts
```

- [ ] **Step 2: 构建正式包**

```bash
npm run build
```

预期：`shared/skills` 的修改同步到 `codex/skills`，构建命令成功。

- [ ] **Step 3: 运行最终检查**

```bash
npm run check
git diff --check
```

`npm run check` 统一覆盖完整测试、构建和校验，不重复执行被覆盖的命令。

- [ ] **Step 4: 独立审查**

确认只修改 Plugin/Skill 源码、契约测试和构建产物；没有改动 MCP Server、Agent Server、Studio UI、Schema 或无关未提交文件。

- [ ] **Step 5: 交付前报告**

向用户报告当前分支、待提交文件、专项测试和最终验证结果，等待用户明确确认后再创建唯一最终提交；推送需要另行确认。
