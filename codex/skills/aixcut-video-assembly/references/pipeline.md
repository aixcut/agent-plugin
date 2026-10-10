# Video Assembly: Stage Details

This reference specifies what to read and confirm at each stage. Use the specialist Skills and live Tool Schemas for exact parameters.

After every structural write, reread the affected `timeline`, `audio`, or `captions` view immediately. Do not reuse refs across revisions or wait until export to verify writes.

For multiple versions, call `aixcut_timeline list`, then duplicate the source timeline. Keep a separate `timeline_id` for each version. For each version, read, edit, reread/review that same timeline, then export. Reuse generated and source media across versions within the same Project.

| Tool | action |
| --- | --- |
| aixcut_timeline | list |
| aixcut_timeline | create |
| aixcut_timeline | duplicate |
| aixcut_timeline | rename |
| aixcut_timeline | delete |
| aixcut_timeline | reorder |
| aixcut_primary | set |
| aixcut_primary | add |
| aixcut_primary | replace |
| aixcut_primary | delete |
| aixcut_primary | reorder |
| aixcut_voice | set |
| aixcut_voice | add |
| aixcut_voice | update |
| aixcut_voice | delete |
| aixcut_voice | reorder |
| aixcut_voice | render |
| aixcut_voice | settings |
| aixcut_audio | add |
| aixcut_audio | update |
| aixcut_audio | replace |
| aixcut_audio | delete |
| aixcut_audio | trim |
| aixcut_audio | split |
| aixcut_audio | move |
| aixcut_audio | time |
| aixcut_audio | retime |
| aixcut_audio | fade |
| aixcut_caption | mode |
| aixcut_caption | regenerate |
| aixcut_caption | set |
| aixcut_caption | add |
| aixcut_caption | update |
| aixcut_caption | delete |
| aixcut_caption | split |
| aixcut_caption | style |
| aixcut_caption | highlight |
| aixcut_generate | submit |
| aixcut_generate | quote |
| aixcut_generate | get |
| aixcut_generate | execute |
| aixcut_generate | list |
| aixcut_generate | cancel |
| aixcut_frontend | export_timeline |
| aixcut_frontend | export_timeline_status |

## Stage 0: Confirm source readiness

1. Read the Project summary and source list:

```json aixcut_read
{
  "view": "sources"
}
```

2. Do not use an old server-side analysis status to decide whether a local video is available. For `import_local_media`, wait for `import_status` to reach a terminal state. For `prompt_add_material`, wait for the user's confirmation and match the uploaded file by `file_name` in `sources`.
3. For videos with speech, wait until that source's `transcript_status` is `available` before reading `source_lines`. Without speech or a transcript, use `capture_source_frames` or `capture_timeline_frames` as needed for visual evidence.
4. Export the assembled video through `aixcut_frontend` page export. Do not branch on whether a complete server-side video copy exists.
5. If media is missing or insufficient, ask the user to upload it using the “Local media” flow in `aixcut-timeline-editing`, then wait for the upload to finish.
6. If import or transcription is still running, reread later. Do not re-import or substitute other media.

For local media, the Project page must be open and media access must be restored before capture or export.

## Stage 1: Visual structure

1. Read `timeline` to inspect existing clips and the target duration.
2. Create a lightweight shot plan before editing. For each shot, record the source ref, source in/out points, output time range, visible subject, and which claims the image can support. Use `capture_source_frames` when needed; do not state specific visual facts without evidence.
3. Choose source ranges and durations to meet the requested total length.
4. Give the sequence a narrative: an engaging opening, a developed middle, and a clear closing action or emotional landing.
5. Read the timeline back and verify there are no unintended gaps or overlaps and the total duration matches. Do not save the shot plan as a Project document unless asked.

## Stage 2: Voice script

- Match script length to the available duration. As a rough estimate, Chinese narration uses 4–5 Chinese characters per second; calculate the target length before drafting.
- Give the script a beginning, development, and conclusion; do not simply read asset titles aloud.
- Choose a voice that matches the requested style. If none is specified, select a reasonable default and tell the user.
- Follow `aixcut-voice` for the full workflow.
- Follow the language policy in `aixcut-basics`: the script uses the requested content language, independent of the conversation language.

## Stage 3: Render and place voice audio

1. **Render:** Call `aixcut_voice(render)` and wait for per-segment results. One call generates or reuses audio, registers the media, binds voice segments, and starts transcription; do not poll an obsolete voice Job.
2. **Place audio:** For a full rebuild of the dedicated voice track, pass `place=true` and confirm `placement.status="applied"`. This clears and rebuilds the target voice track. To preserve existing clips or custom timing, omit `place` and place audio with `aixcut_audio`. Reread `timeline` and confirm the clips, timing, and source refs.
3. Reread the audio source's `transcript_status`. Continue with automatic captions only when it is `available`; otherwise wait and reread.

If `place` is omitted and no manual placement is done, generated audio is not part of the video. On timeout, the outcome is unknown: retry with the same idempotency key and original parameters.

## Stage 4: Captions

1. Derive narration captions from the transcript of the voice audio that is actually on the timeline. A written script alone does not prove transcription or caption completion.
2. When `transcript_status=available`, call `aixcut_caption(regenerate)`, then reread `captions` and check that the text and timing match the voice.
3. If voice audio is not on the timeline (`MCP_CAPTION_VOICE_AUDIO_NOT_ON_TIMELINE`), place it and reread `timeline`. For pending transcripts (`MCP_CAPTION_TRANSCRIPT_PENDING`), missing, stale, or empty transcripts, follow the error code. Never fabricate a transcript from the script. Continue other editing if possible, but report why captions were not generated.
4. Captions follow the voice timing, not shot boundaries. Keep each caption to at most two lines and split long sentences at semantic boundaries.
5. After derivation, reread `captions` and check count, first and last times, text, and mode. A manual write switches to manual mode; do not switch back to automatic mode blindly.
6. See `aixcut-captions` for caption-specific details.

## Stage 5: Background music

1. Cover the full video duration with one music clip or divide it into sections.
2. Add fades at both ends using `fade_in_ms` and `fade_out_ms`; see `aixcut-timeline-editing`.
3. When narration is present, set music `volume` to about 0.2–0.4 so speech remains clear. Normal volume may be used without narration.
4. Confirm that music and voice use parallel audio tracks and mix together.
5. For a music source in the Project library, call `aixcut_frontend(action=analyze_music_beats)` with its `media_id`. Use returned beat times for edit points only when `status=available` and `beat_times_ms` is present. Preserve BPM, confidence, analysis duration, and timestamps as evidence. If analysis returns `unable_to_determine` or decoding/authorization fails, report beat alignment as “unable to determine”; do not infer BPM from listening or duration.
6. Beat analysis is read-only and does not cut the timeline. Reread the timeline after each beat-based edit.

## Stage 6: Final review

Read the relevant views and verify each item; do not rely on memory.

| Check | How to verify | Pass condition |
| --- | --- | --- |
| Total duration | Read `timeline` | Matches the requested duration |
| Visual continuity | Read `timeline` | No unintended gaps or overlaps |
| Voice placement | Read `voice` and `timeline` | Voice segments are ready and matching audio clips exist |
| Caption count | Read `captions` | Count is reasonable and first/last times align with voice |
| Music fades | Read `audio` | Music clips have the requested fades |
| Export readiness | Check `renderability` with `aixcut_review` | No blocking issues |
| Transcript state | Read the voice audio source | Claim transcript availability only for `available`; report other states as returned |
| Full playback | Current MCP cannot prove the exported file was played and heard in full | State “full playback/listening not verified” unless it was actually reviewed |

## Stage 7: Export

Use `aixcut-export` for page export and status polling. The finished file is downloaded by the user's browser and has no server download URL. Report only the filename, size, and format returned by the page.

## Common symptoms

| Symptom | Cause | Recovery |
| --- | --- | --- |
| No sound in export | Voice was rendered but not placed | Return to Stage 3, step 2 |
| Voice exists but captions are missing | Render may be partial, timed out, or not placed; captions also need separate verification | Check per-segment results, placement, and `transcript_status`; regenerate and reread captions only when audio is on the timeline and transcription is available |
| Abrupt music start or end | Music has no fades | Add fades to the music clip |
| Narration is hard to hear | Music volume is too high | Lower music `volume` using `aixcut-timeline-editing` |
| Beat alignment cannot be verified | `analyze_music_beats` returned `unable_to_determine` or page decoding/authorization failed | Report “unable to determine”; do not invent BPM or beat-matched shots |
| Export fails while the page is open | Page export failed or media access expired | Check `export_timeline_status`; ask the user to click the page to restore access if required |
