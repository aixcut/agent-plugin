---
name: aixcut-voice
description: "Write voiceover scripts, select a voice, synthesize speech, and optionally place it on the timeline. Do not use for music or visual assembly. Chinese triggers: 配音、旁白、解说、口播文案、换音色."
---

# Aixcut Voiceover

## Conversation guidance

State whether the script, voice selection, rendering, or timeline placement is in progress and what happens next. Follow the requested content language and preserve supplied copy unless translation or rewriting is requested. Pause for consequential voice or script choices, unaccepted generation cost, or overwrite risk; verify the rendered and placed audio before reporting completion.

Voice scripts and voice profiles are stored in the Project Voice document. Rendered audio is linked back to its voice segments. Timeline placement is a separate optional step.

## Workflow

1. Call `aixcut_read(view="voice")` to read the voice segments, profiles, and defaults.
2. Use `aixcut_voice(set/add/update/settings)` to update scripts, profiles, or settings as requested.
3. Call `aixcut_voice(action="render", targets=[...])`. This generates or reuses audio, registers the media, links it to voice segments, and waits for transcription.
4. If the user asks to place audio on the timeline, pass `place=true`; optionally set `start_ms`, `gap_ms`, and `track`. Placement clears and rebuilds the selected dedicated voice track, so use this only for that voice track. Omit `place` when placement is not requested.
5. Report segment results and `placement` separately. Successful audio generation does not prove timeline placement succeeded.

Voice rendering requires the user to be signed in and the target Project page to be open. A closed, unready, or read-only page returns an explicit error. A timeout means the outcome is unknown: retry with the same `idempotency_key` and identical arguments. Use a new key only when the user explicitly asks to regenerate.

## Script language and voice

- Write the voice script in the user's requested content language or audience language. Conversation language does not determine voice language.
- Preserve user-provided scripts unless asked to translate or rewrite. If the user asks for translation, translate into the explicit target language before rendering; do not silently translate.
- If the script language is unclear and changes the result, ask one concise question before rendering. Do not use an English prompt or Skill as a reason to switch the spoken language to English.
- Apply the shared language policy from `aixcut-basics`.
- Voice profile IDs must come from `profiles` returned by `aixcut_read(view="voice")`.
- Use the voice the user names. Otherwise, use the document default.
- Split multi-part scripts at natural pauses. Each segment renders separately and is placed in order.
- Speed and emotion values must be among those listed in the action reference.

## Boundaries

- `render` does not edit the timeline by default; only `place=true` places audio.
- Failed segments are reported individually. Partial failure prevents placement; fix the script or voice profile and retry with a new key.
- After the server accepts a Job, rendering may continue even if the browser disconnects; disconnecting does not cancel generated audio.
- Never write `audio_status`, `audio_media_id`, or `audio_synthesis_hash` manually; the voice Job owns those links.
- See [references/actions.md](references/actions.md) for parameters.

## Completion

Check each segment status and `placement`. For render-only requests, confirm each voice segment has audio. If placement was requested, also confirm `placement.status="applied"`.
