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
| aixcut_caption | mode | `mode` | — | Set caption mode: `auto` follows the primary video track and rebuilds all captions, replacing manual content; `manual` allows direct editing. |
| aixcut_caption | regenerate | — | — | Rebuild the caption track from video-clip transcripts. If no transcript exists, it returns an empty result with a warning. |
| aixcut_caption | set | `items` | — | Replace all captions. |
| aixcut_caption | add | `items` | `start_ms` | Append captions; if no start is supplied, append at the end. |
| aixcut_caption | update | `target` | `text`, `values`, `style`, `highlight_ranges`, `x`, `y`, `enabled`, `duration_ms` | Update one caption's fields or content. |
| aixcut_caption | delete | `target` | — | Delete one caption. |
| aixcut_caption | split | `target` | `at_ms`, `char_index`, `to_ms` | Split one caption into two by time or character position. |
| aixcut_caption | style | `target` | `style`, `highlight_ranges`, `x`, `y` | Update caption style or position. |
| aixcut_caption | highlight | `target` | `highlight_ranges` | Set highlights as an array of `{ start, end }` character ranges. |

## Caption mode

- Manual writes, wording changes, splits, deletions, styling, and highlights switch the track to `manual`; no additional `mode` action is needed.
- `regenerate` does not change the mode; it rebuilds the track from transcripts.
- Use `mode="auto"` only when restoring automatic following. It rebuilds all captions and overwrites manual content.
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
