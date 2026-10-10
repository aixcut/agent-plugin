---
name: aixcut-generation
description: "Generate images, videos, or music in Aixcut and track asynchronous jobs. Use for new visual or audio assets and generation progress. Do not use to edit existing media or assemble a complete video. Chinese triggers include 生成图片、生成视频、生成音乐、查看生成进度."
---

# Aixcut Generation

## Conversation guidance

State whether generation is being prepared, queued, running, or complete, and what happens next. Continue safe status checks when possible. Pause before an unaccepted cost or credits, or when a missing creative choice would materially change the result. Do not describe a submitted Job as a finished asset.

Generation creates a durable Job; it is not a synchronous operation.

## Short path

1. Confirm the target Project; read `aixcut_read(view="project")` if needed.
2. If generation may consume credits and the user has not accepted a quoted amount, call `aixcut_generate(action="quote")`. It does not create a Job. If the quote is nonzero, explain the amount and wait for the user's acceptance before submitting; pass the accepted amount as `accepted_quoted_credits`.
3. Submit using `aixcut_generate(action="submit")` only after required creative choices are clear and any quoted charge is accepted.
4. If the envelope returns `status: "async"`, use its top-level `job_id` with `aixcut_generate(action="execute")` to advance the job. `get` only reads status.
5. Use top-level `next_action.after_seconds` for the next poll. Stop when top-level `terminal` is true.
6. Report top-level `phase`: `waiting` (queued), `processing` (generating), or `finalizing` (publishing to the Project). Do not report only “in progress.”
7. After generation, place the result on a timeline when the user asked for it.

For multiple video versions, the assembly Skill first lists and duplicates timelines with `aixcut_timeline(action="list")`. `aixcut_generate` creates Project-level assets that can be reused by multiple `timeline_id`s. Place and verify the result on each requested timeline.

## Content language and prompt

Follow the user's requested content language and target audience for visible text, dialogue, lyrics, or other language-bearing parts of the asset. A prompt may be written in English for model reliability, but the prompt must still explicitly state the requested spoken/on-screen language when relevant. Do not silently translate the user's creative brief or switch the asset to English because this Skill is in English. Preserve the creative direction and wording unless asked to adapt it. Apply the shared language policy from `aixcut-basics`.

Resolve only the language choice relevant to the requested asset: visible text for images; dialogue and on-screen text for videos; lyrics for songs (instrumental music has no content language); and script language for voiceover. If the user says “song” but does not indicate lyrics or instrumental music, ask which they want before quoting or submitting. Do not ask about language for instrumental music.

## Generation types

- `kind` is `image`, `video`, or `music`; the server processes music as audio.
- If the user does not specify a provider, use the server default. Override only on explicit request.
- Prompt, style, duration, and language-bearing content should follow the user's brief; do not rewrite the creative direction without reason.

## Asset source

Generation creates assets in the Project library; it does not import files or perform post-production on existing audio. Use `aixcut-timeline-editing` to place, trim, mix, or fade audio, and `aixcut-timeline-editing` or `aixcut-documents` to import local media or documents. Provider-supported image editing with reference images remains a generation operation.

Generated media does not guarantee exact beat alignment, lyric timing, or caption timing. Do not promise frame-accurate synchronization from a generation prompt; use timeline tools and read-back evidence for placement and synchronization.

- Generated assets enter the Project library. Final video export happens in the open Project page.
- Do not invent URLs or send local paths as links.

## Boundaries

- Submission is not completion. Do not report success while the Job is `queued`, `running`, or `publishing`.
- On failure, report `result.data.job.error_code`.
- Top-level `retryable` appears only for failed Jobs. `true` means the same request may work later; `false` means fix parameters, media, or configuration first. Do not retry automatically when absent.
- Use `action="cancel"` to cancel and `action="list"` to list Jobs.
- Generation download URLs are short-lived signed URLs. Do not store them in Project documents or retain them long term.

## Completion

The Job must be terminal, the asset must be placed if requested, and a timeline read must show the corresponding clip. Report `job_id`, final status, and placed ref.
