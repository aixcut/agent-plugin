# Caption Action Reference

This reference maps each `aixcut_caption` action to its fields. Source selection, timing, and completion criteria are defined in the main Skill.

## Common fields

- `project_id`: optional; omitted means the current Project.
- `idempotency_key`: optional; the server creates and returns one when omitted. Reuse it only when retrying an identical request; use a new key for a new write intent.
- `target`: a stable ref or ID returned by `aixcut_read`; never guess IDs.
- `items`: array of captions, with each item validated by the server Schema.
- Every Tool uses a strict object; send only fields listed here.
- `style` accepts editor text-style keys only. See the timeline-editing action reference for valid keys.

## Actions

| Tool | action | Required besides `action` | Optional | Description |
| --- | --- | --- | --- | --- |
| aixcut_caption | mode | `mode` | — | Set the follow flag: `auto` follows the primary video track; `manual` allows direct editing. Changing the flag does not rebuild or replace captions. |
| aixcut_caption | regenerate | `plan_context` | — | Rebuild the caption track from video-clip transcripts. Run only when `transcript_status=available`; otherwise returns an empty result with `MCP_CAPTION_TRANSCRIPT_EMPTY`. |
| aixcut_caption | set | `items`, `plan_context` | — | Replace all captions and switch the track to `manual`. |
| aixcut_caption | add | `items` | `start_ms` | Append captions and switch the track to `manual`; if no start is supplied, append at the end. |
| aixcut_caption | update | `target` | `text`, `values`, `style`, `highlight_ranges`, `x`, `y`, `enabled`, `duration_ms` | Update one caption's fields or content. |
| aixcut_caption | delete | `target`, `plan_context` | — | Delete one caption and switch the track to `manual`. |
| aixcut_caption | split | `target` | At least one of `at_ms`, `char_index`, `to_ms` | Split one caption into two by time or character position. Existing `highlightRanges` are copied, not remapped; reread and correct highlights after splitting. |
| aixcut_caption | style | `target` | `style`, `highlight_ranges`, `x`, `y` | Update caption style or position. |
| aixcut_caption | highlight | `target` | `highlight_ranges` | Set highlights as an array of `{ start, end }` character ranges. |

## Caption mode

- `set`, `add`, wording changes, splits, deletions, styling, and highlights switch the track to `manual`; no additional `mode` action is needed.
- `regenerate` does not change the mode; it rebuilds the track from transcripts.
- `mode="auto"` only toggles automatic following; it does not rebuild or overwrite manual content. Use `regenerate` when an actual rebuild is requested and the transcript is available.
- Read the current mode from `aixcut_read`'s `captions` view; the value is `auto` or `manual`.

## Full replacement example

These Chinese captions are deliberate user-facing content; the tool reference remains English:

```json aixcut_caption
{
  "action": "set",
  "idempotency_key": "7d3f0b6e-3d2a-4c9f-9d5c-6a1b2c3d4e5f",
  "items": [
    { "text": "Some views are waiting for you along the way.", "start_ms": 0, "duration_ms": 3200 },
    { "text": "At dawn, the first light passes through the forest canopy.", "start_ms": 3200, "duration_ms": 3600 }
  ]
}
```
