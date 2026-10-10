---
name: aixcut-timeline-editing
description: "Edit Aixcut clips, text, audio, tracks, canvas, and local imports. Do not use for voice scripts, full assembly, or export. Chinese triggers: 剪切、拼接、裁剪、删除片段、加文字、加音乐、轨道、画布、上传素材."
---

# Aixcut Timeline Editing

## Conversation guidance

State what timeline change is underway and what happens next when useful. Read current state and proceed when the request is clear and safe. Ask one question only when a missing decision materially changes the edit. If a local file or browser action requires the user, name the exact action and the condition for continuing.

Use the real MCP Tools. Do not use curl, hand-written JSON as a substitute for a call, direct database writes, or local files to reconstruct a result.

Voice, captions, and export have dedicated Skills: `aixcut-voice`, `aixcut-captions`, and `aixcut-export`.

## Minimal workflow

1. Read every view needed for the requested edit and use only stable returned refs; never guess IDs.
2. Create a fresh UUID v4 `idempotency_key` for each new write intent.
3. Call the narrowest Tool and action matching the intent.
4. Read affected views after a successful write; use `aixcut_review` when structure or visual placement needs confirmation.
5. Report the actual result fields when present: `status`, `mutation_id`, `operation_id`, `revision_after`, `created`, `removed`, `ref_map`, and `warnings`.

## Multiple timelines and versions

- For versions, A/B variants, aspect-ratio adaptations, or “keep the original and make another”, call `aixcut_timeline(action="list")` first.
- Create a new version with `aixcut_timeline(action="duplicate", source_timeline_id=...)`; use `create` only when the user explicitly wants a blank timeline.
- After selecting a `timeline_id`, include it in every later read, edit, capture, and review for that version. Do not mix refs across timelines.
- Do not create an extra timeline for a single-version request.

## Tool selection

| Intent | Tool |
| --- | --- |
| Read or review | `aixcut_read`, `aixcut_review` |
| Main video sequence | `aixcut_primary` |
| Voice segments | `aixcut_speech` |
| Video, image, or Motion Graph clips | `aixcut_clip` |
| Regular on-screen text | `aixcut_text` |
| Music, effects, or placed voice audio | `aixcut_audio` |
| Tracks | `aixcut_track` |
| Canvas or full cleanup | `aixcut_project` |
| Remote browser actions | `aixcut_frontend` |

Send only fields declared by the selected Tool Schema. `aixcut_speech` edits the main voice track; `aixcut_text` does not edit captions. After a structural change, reread before issuing a position-dependent command.

## Keep visual layers separate

- The caption track is only for text that follows spoken words. Ingredient labels, arrows, circles, callouts, titles, and other visual annotations are not captions.
- Add static or editable text annotations with `aixcut_text` on a non-caption text track. For an existing Motion Graph asset, add it with `aixcut_clip` on a video overlay track and set that item's `kind` to `motion-graph`; the default `video` kind rejects Motion Graph media. Never target a text or caption track with a Motion Graph.
- Before adding an annotation, read the track list and choose a track whose kind matches the asset. After the write, read back the clip kind and track. If placement fails or lands on the wrong layer, correct or move the requested element; do not silently delete it or count subtitles as a replacement.
- If no supported asset or operation can create the requested animation, report that limitation and preserve it as unfinished work; do not substitute a caption or claim the animation is complete.

## Idempotency and result states

- Treat `applied`, `noop`, and `applied_with_warning` according to their literal meanings.
- `duplicate: true` means the UUID replayed an earlier successful write and did not add another change.
- For `status_unknown`, preserve every original parameter and reuse the same UUID.
- Never reuse a UUID for different parameters or intent; use a new UUID after `NLE_IDEMPOTENCY_CONFLICT`.

## Canvas, audio, and tracks

- A new Project may start at `0×0`. The first visual write chooses the source dimensions; if none are available, the server falls back to `1920×1080` and returns `MCP_CANVAS_DEFAULTED`. Use `aixcut_project action=canvas` for an explicit portrait or other ratio.
- Add music, effects, or rendered voice through `aixcut_audio`. Use `fade` with `fade_in_ms` and `fade_out_ms` for music, and lower music `volume` to about 0.2–0.4 when narration must remain clear.
- Before adding audio, ensure an audio track exists with `aixcut_track action=ensure`. If read-back reports `MCP_TRACK_ENSURE_NOT_APPLIED`, retry once with a new UUID.
- Change track mute or enabled state only after reading the current track state.

## Local media

There are two supported import paths. Both are asynchronous and an accepted response does not mean that the media is ready.

### Ask the user to upload

Call:

```json aixcut_frontend
{"action":"prompt_add_material"}
```

A completed response means the upload area is open. Tell the user to select or drag files. After the user confirms upload, read `aixcut_read(view="sources")` and match by `file_name`; do not call `prompt_add_material` again.

### Import an explicit local path

When the user gives local paths, locate the plugin helper first and use the Site origin from the connected MCP Server instructions:

```bash
BRIDGE=$(find ~/.codex/plugins -maxdepth 6 -name local-media-bridge.mjs 2>/dev/null | head -1)
node "$BRIDGE" /absolute/path/a.mp4 /absolute/path/b.mp4 --allowed-origin "<MCP Server Site origin>"
```

Use the printed `files[].url` values in one `aixcut_frontend(action="import_local_media")` call, with `url` for one file or `urls` for up to eight. Never invent the origin, URL, or port. The helper manages its own background process and port, reuses a running bridge when possible, and expires after its TTL; do not wrap it in `screen`, `nohup`, or `&`. If some URLs fail, report only those files and do not resubmit the full batch. If all fail, ask the user to use the manual upload path.

The response includes `import_ids`. Poll only those IDs with `import_status`. Follow `next_action.after_seconds`; do not re-import while an item is running. An item is settled only when its status is `ready`, `failed`, or `cancelled`, and its `private_copy` is no longer `copying`.

- On `ready`, use the returned `media_id` directly; do not search `sources` again.
- On `unknown`, the page no longer tracks the import (for example, after a refresh). Reread `sources` and match by `file_name`.
- Retry `failed` or `cancelled` only when `retryable` is `true`; otherwise report its `error_code` and `error_message`.
- `private_copy=ok` means the complete local copy is saved. `fallback` means the media remains usable, but refresh or page export may fail to access the original; report `private_copy_reason`. Removing a clip from the timeline does not remove this copy. It is released when the source is deleted from the library or the Project is deleted.

For `prompt_add_material`, there is no `import_id`. After the user says the upload is complete, reread `sources` and match by filename. If it has not appeared, wait about 15 seconds and reread; never reopen the prompt to confirm the same upload.

Local video does not require a complete server-side video copy. The browser keeps the original and sends extracted audio for transcription; use `capture_source_frames` or `capture_timeline_frames` for visual evidence. If `CAPTURE_PERMISSION_REQUIRED` occurs, ask the user to click the Project page once and retry the original capture. If the bridge is unreachable, rerun it for a fresh URL or use the manual upload path.

## Captures and visual placement

Use `capture_source_frames` or `capture_timeline_frames` when visual evidence is needed. The result returns temporary JPEG URLs in `result.data.artifacts`. To save them locally, pass the exact JSON Tool result through stdin to `scripts/download-capture-artifacts.mjs <output-directory>`. Report a local path only after the helper succeeds; the remote MCP server does not write files to the local machine.

For `aixcut_clip(action="layout")`, provide exactly one of `preset` or `box`. `box` uses 0–1 canvas ratios; `fit` is `contain`, `cover`, `fill`, or `none`; `opacity` is 0–1. After changing layout, capture one timeline frame and match each composition entry to its ref. Do not capture for edits that change only time, volume, fades, or text content.

The editor does not expose reliable zoom, rotation, or anchor edits. Use `box` dimensions or a supported preset instead.

## Content language

Tool and workflow terms stay in English. Explain confirmations in the user's current conversation language. Text added to the timeline, including overlays and titles, follows the user's requested content or target-audience language; do not infer English from this Skill.

## Authentication and failures

The Codex Host handles OAuth. Do not call `aixcut_login` first or bypass permissions. For stable error-code recovery, load `aixcut-known-errors`. Report real status and read-back evidence.

Parameter details are in [references/actions.md](references/actions.md).
