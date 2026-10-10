---
name: aixcut-verification
description: "Verify Aixcut structure, timeline, voice, captions, and renderability. Read-only: never edit. Chinese triggers: 检查改动、核对结果、能否导出、导出前检查."
---

# Verify Aixcut Results

## Conversation guidance

Separate verified facts, unresolved checks, and the next step. Report only what the read-back or review confirms; if a check is unavailable, say what remains unverified and how to complete it.

Every write needs the verification appropriate to the request. A tool result of `applied` is not by itself a final conclusion.

## Short path

1. Read the affected view, such as `timeline`, `captions`, `speech`, or `voice`.
2. Call `aixcut_review` for structural checks.
3. Capture frames when the user needs visual confirmation.
4. Report what passed and what was not checked.

## Review scope

| view | Check |
| --- | --- |
| `project` | Overall Project structure and tracks. |
| `timeline` | Clip order, duration, gaps, and overlaps. |
| `voice` | Voice script, profile, and timeline placement. |
| `renderability` | Static structure, source availability, and valid duration. Do not apply removed server-renderer v1 limits. Canvases beyond the 4K UHD pixel budget produce a `CANVAS_HIGH_RESOLUTION` warning; do not change the canvas automatically. |

## Visual verification

Frame capture is conditional. It is required when:

- Any visual clip's position or size changes, or another visual is layered at the same time.
- A lower third, caption position, or caption visibility changes.
- The user asks whether something is obscured or how it looks.

Do not capture frames for timing-only edits (trim, split, move, speed), volume, fades, caption wording, or track add/remove. Those changes do not alter the image; capture would only add latency and context.

### Capture procedure

- Use `aixcut_frontend(capture_source_frames)` for source footage and `capture_timeline_frames` for the timeline composition.
- `selections` contains 1–8 entries. Each entry must use exactly one form: `{"times_ms":[2000,7000]}` (up to 16 timeline points or 24 source points) or `{"start_ms":0,"end_ms":6000,"count":3}`. Do not mix forms within an entry.
- Capture 1–8 frames in one call and stop when sufficient; do not keep capturing.
- Pass `expected_revision` when the latest revision matters. `MCP_FRONTEND_TIMELINE_STALE` means the timeline changed; reread it before deciding whether to capture again.
- If capture returns `CAPTURE_PERMISSION_REQUIRED`, ask the user to click anywhere on the Project page, then retry the same request. Do not reimport media.
- Captured frames are temporary JPEG URLs. Provide usable links to the user when available; do not claim that the MCP server wrote them to the user's computer.

### Inspecting the composition

- Timeline capture results include a `composition` roster. Use it to map visible elements to refs rather than guessing.
- `composition.frames` gives each captured frame's `index`, `times_ms`, and visible items with ref, time range, track, and `visual_position`. `index` matches the image order. Items with `enabled: false` are absent from the rendered frame.
- If `frames` is missing, use `composition.clips` as the full timeline roster and map each image to its time.
- The roster's `visual_position` should match the read-back: `preset` is a named position, `box` is a freeform proportional box, and `auto` means the editor is arranging it automatically.
- If an element obscures another element or captions, fix the position and capture again. Do not infer the corrected result from the first image.

## Pre-export checks

`renderability` is a static structure check, not an export simulation. The Project page renders local or cloud media; a full cloud copy is not required. Do not reject Motion Graph or other features using obsolete server-renderer v1 limits. `renderable: true` means only that the snapshot structure passed; it does not prove the page can decode every source or that export will succeed. The final outcome is `export_timeline_status`.

Warn the user to confirm the target resolution when the canvas exceeds the 4K pixel budget because this can increase render time and file size. Do not change it without instruction.

Structural review cannot prove that the output plays fully, has synchronized audio/video, or sounds correct. MCP has no complete playback/listening check. If there is no playback or listening evidence, state “full playback/listening not verified”; do not present a passing `review` as proof of finished media quality. Caption verification must distinguish a voice script from a real transcript: the automatic caption path is complete only when the audio source has `transcript_status=available` and `aixcut_read(view="captions")` returns captions.

## Boundaries

- Verification is read-only. Do not modify content during the check.
- Browser actions require the target Project page to be online. If it is offline, report that visual verification could not be completed; do not substitute structural checks for visual proof.
- Structural review and visual inspection prove different things. Report them separately.

## Completion

Each user-requested change must have a matching read-back or review result, and the summary must reflect the actual result.
