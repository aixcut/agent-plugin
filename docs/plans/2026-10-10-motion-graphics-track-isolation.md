# Motion Graphics Track Isolation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent Motion Graph annotations from being written to the caption track or being deleted during caption regeneration by making the Plugin workflow classify, preflight, explicitly place, and verify visual layers.

**Architecture:** Keep the change in the AIXCut Plugin Skill layer. The assembly Skill owns the stage order and classification; the timeline Skill owns track discovery, track creation, explicit tool parameters, and read-back checks; the captions Skill states that caption regeneration never substitutes for visual annotations. The MCP server remains unchanged in this task.

**Tech Stack:** Markdown Skills, Vitest contract tests, local Plugin build/validation scripts.

---

### Task 1: Add failing contract tests for Motion Graph routing

**Files:**
- Create: `tests/contracts/motion-graphics-guidance.test.ts`

**Step 1: Write the failing test**

Assert that the relevant Skill text requires:

- spoken captions, static art text, and Motion Graphs to use separate tools;
- an explicit non-caption track ref for text annotations and an explicit video overlay track for Motion Graphs;
- `aixcut_track action="ensure"` before writing when the required track is absent;
- `kind="motion-graph"` with `aixcut_clip` for existing Motion Graph assets;
- immediate timeline read-back of clip kind and track role;
- correction or move on a wrong track, never silent deletion or caption substitution;
- final caption verification that the caption track contains no Motion Graph or art-text clips.

Also assert that the old ambiguous behavior is absent: no default-track placement, no use of `aixcut_text` for Motion Graphs, and no “delete it and continue” fallback.

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/contracts/motion-graphics-guidance.test.ts`

Expected: FAIL because the current guidance does not require explicit track creation, explicit refs, or final caption isolation.

---

### Task 2: Update timeline and assembly Skill guidance

**Files:**
- Modify: `shared/skills/aixcut-timeline-editing/SKILL.md`
- Modify: `shared/skills/aixcut-video-assembly/SKILL.md`
- Modify: `shared/skills/aixcut-video-assembly/references/pipeline.md`

**Step 1: Implement the minimal guidance**

In the timeline Skill, add an operational Motion Graph workflow:

1. Read `timeline` tracks before adding any visual annotation.
2. Treat `role=caption` as reserved for spoken/user-supplied subtitle copy.
3. Ensure a separate `kind=text`, non-caption track for static labels and a separate `kind=video`, overlay track for Motion Graphs when missing.
4. Always pass the returned track ref explicitly.
5. Use `aixcut_text` only for static art text and `aixcut_clip` with `kind="motion-graph"` for an existing Motion Graph source.
6. Read `timeline` immediately after the write and validate source, kind, track id, and track role.
7. Move/correct wrong placement; do not delete the requested annotation or count a caption as a replacement.

In the assembly Skill, make visual annotations an explicit stage before caption generation, and require a final independent check of captions and annotations.

**Step 2: Run the targeted test**

Run: `npx vitest run tests/contracts/motion-graphics-guidance.test.ts`

Expected: PASS.

---

### Task 3: Strengthen caption isolation guidance

**Files:**
- Modify: `shared/skills/aixcut-captions/SKILL.md`

**Step 1: Add the guardrail**

State that caption regeneration/set/update operates only on spoken subtitle text. Before reporting completion, verify that captions contain no Motion Graph, art-text, callout, arrow, or animated highlight clips; those remain on their dedicated visual tracks.

**Step 2: Run the focused contract tests**

Run: `npx vitest run tests/contracts/motion-graphics-guidance.test.ts tests/contracts/skill-contracts.test.ts`

Expected: PASS.

---

### Task 4: Build and validate generated Plugin package

**Files:**
- Generated: `codex/skills/aixcut-timeline-editing/SKILL.md`
- Generated: `codex/skills/aixcut-video-assembly/SKILL.md`
- Generated: `codex/skills/aixcut-captions/SKILL.md`

**Step 1: Rebuild**

Run: `npm run build`

Expected: Codex package regenerated from `shared/`.

**Step 2: Run final verification**

Run:

```bash
npm test
npm run validate
git diff --check
```

Expected: all tests pass, Plugin validation passes, and no whitespace errors are reported.

**Step 3: Verify source/generated parity**

Compare the three changed Skill files under `shared/skills/` and `codex/skills/`.

Expected: each generated file matches its source Skill.
