# Voice Action Reference

This reference lists fields for `aixcut_voice`. All objects use a strict Schema; extra fields are rejected.

## Common fields

- `project_id`: optional; omitted means the current Project.
- `idempotency_key`: generated automatically. Reuse it only for a retry of the same operation; use a new key for a new intent.
- `target` / `targets`: Voice refs or IDs from `aixcut_read`; never guess IDs.
- `items`: array of voice segments.

## Voice fields

| Field | Meaning |
| --- | --- |
| `text` | Voice script in the requested content language. |
| `speaker` | Speaker identifier. |
| `voice_profile_id` | Voice profile ID from `Voice.profiles`. |
| `emotion` | `auto`, `happy`, `sad`, `angry`, `fearful`, `disgusted`, `surprised`, `calm`, or `neutral`. |
| `speed` | `0.5`, `0.75`, `1`, `1.25`, `1.5`, `1.75`, or `2`. |
| `volume` | A value from 0 to 1. |

## Actions

| Tool | action | Required | Optional | Description |
| --- | --- | --- | --- | --- |
| aixcut_voice | set | `items` | — | Replace all voice segments. |
| aixcut_voice | add | `items` | — | Append voice segments. |
| aixcut_voice | update | — | `target`, `targets`, `text`, `speaker`, `voice_profile_id`, `emotion`, `speed`, `volume`, `values` | Update voice segments. |
| aixcut_voice | delete | — | `target`, `targets` | Delete voice segments. |
| aixcut_voice | reorder | `order` | — | Reorder segments using the complete list. |
| aixcut_voice | render | `targets` | `force`, `place`, `start_ms`, `gap_ms`, `track`, `timeout_ms` | Render voice audio; optionally rebuild the dedicated voice track. |
| aixcut_voice | settings | — | `target`, `targets`, `default_speaker`, `default_voice_profile_id`, `default_emotion`, `default_speed`, `default_volume`, `values` | Update defaults when no target is provided, otherwise update selected segments. |

## Render examples

Render audio only:

```json aixcut_voice
{
  "action": "render",
  "targets": ["v1", "v2"]
}
```

Render and place on the selected track with a 300 ms gap:

```json aixcut_voice
{
  "action": "render",
  "targets": ["v1", "v2"],
  "place": true,
  "start_ms": 0,
  "gap_ms": 300,
  "track": "audio"
}
```

The result contains per-segment output and `placement` status: `applied`, `not_requested`, or a failure. Partial segment failure prevents placement. After timeout, retry with the original `idempotency_key`.
