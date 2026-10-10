---
name: aixcut-known-errors
description: "Troubleshoot rejected Aixcut calls by stable error code. Use for Tool failures. Do not use for ordinary editing. Chinese triggers: 报错、失败、为什么报错、无法使用."
---

# Aixcut Error Recovery

## Conversation guidance

Explain what failed, whether work may have partially completed, and the next recovery step. Continue safe recovery when the error contract allows it. If user action is required, name it and state what to retry or inspect afterward. Never present an uncertain state as a success or a definite failure.

Use `error.code`, `error.type`, `error.retryable`, and `error.next_action` to choose recovery. Never branch on `error.message` text. A rejected response is not a successful edit.

## `next_action` kinds

| kind | Meaning |
| --- | --- |
| `none` | Recovery requires a user decision. |
| `resolve_input` | Correct the input or ref before retrying. |
| `retry` | Retry the same request after `after_seconds`. |
| `poll` | Poll the same `job_id`. |
| `open_editor` | Open the required page first. |
| `run_helper` | Run the specified local helper first. |
| `wait_then_read` | The action was accepted but is still running. Wait `after_seconds`, then call the specified read endpoint. Do not report completion or resubmit the action. |

## Input and contract errors

- `MCP_ARGUMENTS_INVALID`, `MCP_ARGUMENT_UNKNOWN`: A field is missing, has the wrong type, or is not allowed. Send only fields declared by the selected Tool Schema.
- `MCP_ACTION_INVALID`, `MCP_VIEW_INVALID`, `MCP_OPEN_TARGET_INVALID`: Use a supported action or view.
- `MCP_IDEMPOTENCY_KEY_INVALID`: Generate a new UUID v4 for `idempotency_key`.
- `MCP_ACTION_UNSUPPORTED`: Choose a Tool that supports the requested action.
- `MCP_LAYOUT_CLIP_UNSUPPORTED`: The target has no visual content. Layout applies only to video and image clips, not audio or text.

## Authorization and project context

- `MCP_SCOPE_REQUIRED`: The current grant lacks a required scope. Let the Codex Host reauthorize; do not bypass the scope with another Tool.
- `MCP_PROJECT_CONTEXT_REQUIRED`: No Project is active. Ask the user to select one or use `aixcut_open` to enter a Project.
- `MCP_PROJECT_NOT_FOUND`, `MCP_PROJECT_NOT_INITIALIZED`: Confirm the target Project before continuing.

## Mutation conflicts and uncertain state

- `MCP_MUTATION_SERVER_REJECTED`: Read the latest snapshot and regenerate the operation. Do not replay the old payload unchanged.
- `NLE_IDEMPOTENCY_CONFLICT`: The UUID is already associated with different content. Create a new UUID and regenerate the operation; never reuse one key with changed input.
- `MCP_TRACK_ENSURE_NOT_APPLIED`: `aixcut_track ensure` returned success, but read-back found no track (often an old UUID replayed a stale receipt). Retry `ensure` once with a new UUID.
- `MCP_CANVAS_DEFAULTED`: This is a warning, not a failure. A `0×0` canvas was set to `1920×1080`. If portrait or another ratio is required, use `aixcut_project action=canvas` to override it.
- `MCP_MUTATION_LOCAL_REJECTED`: Local validation failed, usually because a ref is stale or a range is out of bounds. Read fresh data and correct the input.
- `MCP_PROJECTION_BARRIER_TIMEOUT`, `MCP_ZERO_QUERY_UNAVAILABLE`: The read did not finish before timeout. Retry the same read parameters.
- `MCP_MUTATION_STATUS_UNKNOWN`: The write outcome is unknown. Retry with the exact original parameters and same `idempotency_key`; do not generate a new UUID.

## Browser and local media errors

- `MCP_FRONTEND_NOT_BOUND`: This grant has never been bound to a browser client. Ask the user to open Aixcut in a local browser and enter the target Project, then retry.
- `MCP_FRONTEND_CLIENT_OFFLINE`: This is not an OAuth failure; the current MCP grant has no active browser connection. Call `aixcut_frontend action=page_status` first. Continue only when `presence_connections >= 1` and `online_project_pages >= 1`. If `presence_connections=0`, stop: do not call `aixcut_open` again or resubmit the import/page action. Ask the user to open or switch to the target Project in the same MCP session, then check `page_status` once in the next turn. `open_in_codex` returning `queued` only means the request is queued. Once online, retry the original action once; if offline again, stop and report it.
- `MCP_FRONTEND_PAGE_NOT_ACTIVE`: The client is online, but the active page belongs to another Project or workspace. Use `details.online_pages` and `requested_project_id` to tell the user which Project to switch to.
- `MCP_FRONTEND_CAPABILITY_UNAVAILABLE`: The page and Project are online, but the page has not reported support for this action. Wait 15–30 seconds and retry once; if still unavailable, report it.
- `MCP_FRONTEND_MEDIA_TYPE_INVALID`: The source is not audio. `analyze_music_beats` accepts only a source with `media_type=audio` in `aixcut_read view=sources`.
- If the browser failure is unclear, call the read-only probe `aixcut_frontend action=page_status`. It returns `bound_frontend_client_id`, `binding_error`, `presence_connections`, `online_project_pages`, `online_studio_pages`, and `pages` without throwing an offline error. Use the result to decide whether the user must open a page, switch Projects, or wait.
- Do not repeatedly resubmit the same request for any of the four browser states above. Do not loop through project opens while offline or use another Tool to pretend a page-only action succeeded.
- `MCP_FRONTEND_TIMELINE_STALE`: The timeline changed. Read it again before capturing frames.
- `MCP_FRONTEND_EXPORT_INVALID`, `MCP_EXPORT_INVALID_INPUT`: Page export parameters are invalid (format, dimensions, or frame rate). Correct the parameters and retry once; do not replay unchanged input.
- `MCP_EXPORT_ALREADY_RUNNING`: Do not start another export. Check the existing run with `aixcut_frontend action=export_timeline_status`.
- `MCP_EXPORT_FAILED`: Page rendering failed. Report `error_message`; do not replay unchanged input. If one corrected retry fails, stop and report it.
- `MCP_EXPORT_CANCELLED`: The user cancelled the page export. Report cancellation; do not retry it as a failure.
- `CAPTURE_PERMISSION_REQUIRED`: Browser permission for local media expired after a refresh or browser change. Ask the user to click anywhere in the Project page (or use its “Fix now” control), then retry the original request. Do not re-import the media or bypass the page.
- `MCP_LOCAL_MEDIA_BRIDGE_UNREACHABLE`: The local media bridge URL is no longer serving the file. Do not retry the same URL. Either rerun the helper described by `aixcut-timeline-editing` to obtain its newly printed URL, or ask the user to upload through `prompt_add_material`. Never invent a URL.

Page-export failures appear as `error_code` in `export_timeline_status`, not as a rejected Tool call. Follow `aixcut-export` for those results.

## Server and rate-limit errors

- `MCP_RATE_LIMITED`: Wait `retry_after_seconds`, then retry the same request.
- `MCP_CLIPOS_UNAVAILABLE`, `MCP_CLIPOS_REQUEST_FAILED`, `MCP_INTERNAL_ERROR`: These indicate a server failure and may be retried. Stop and report after repeated failures.

## Generation errors

- `MCP_PROVIDER_TIMEOUT`, `MCP_PROVIDER_TASK_FAILED`: Report the Job's `error_code`. Do not submit a replacement job automatically.

## Voice rendering errors

- `MCP_VOICE_TARGETS_REQUIRED`: `render` needs `targets`; provide the voice segment refs to render.
- `MCP_VOICE_NOT_INITIALIZED`: The Project has no voice document. Add voice segments before rendering.
- If the page is not ready, or voice or segment input is invalid, fix the relevant Project state before retrying. For a timeout, retry with the same `idempotency_key`; do not report the job as cancelled.

## Transcript and source-analysis errors

- `MCP_CAPTION_VOICE_AUDIO_NOT_ON_TIMELINE`: The voice asset is bound to a voice segment but no active narration clip is on the timeline. Place it with `aixcut_audio`, reread `timeline`, then run caption `regenerate`. This does not mean the transcript is empty.
- `MCP_CAPTION_TRANSCRIPT_PENDING`: Voice audio exists or is on the timeline, but transcription is still running. Do not render voice again or fabricate captions. Reread the source later; run caption `regenerate` only when its status is `available`.
- `MCP_SOURCE_TRANSCRIPT_MISSING`, `MCP_SOURCE_TRANSCRIPT_OUTDATED`, `MCP_SOURCE_TRANSCRIPT_EMPTY`: The source is already in the Project, but its transcript is missing, stale, or empty. Follow `transcript_status` in the error details; re-importing is not the remedy.
- `MCP_SOURCE_WORD_TIME_LIMIT_INVALID`: A `source_lines` request for word-level timing has more than 50 rows. Lower `limit` or narrow the request with `selectors`.
- `MCP_SOURCE_LINES_RESPONSE_TOO_LARGE`: A single transcript record exceeds the safe response size. Do not repeat the request. Continue any steps that can use text and timing, then report the oversized record.

## User-facing reports

When a call fails, state which Tool failed, the exact error code, and what the user needs to do next. Explain in the user's current conversation language. Never present a failed action as successful or claim a fix without read-back evidence.
