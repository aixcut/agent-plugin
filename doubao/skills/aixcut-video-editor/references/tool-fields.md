# 工具字段速查

写操作或删除类动作前先看这里：按 action 找到必填字段，再动手。服务端报错也会点名具体字段，
但先查这张表能省掉一轮试错。

## 通用规则

- 顶层字段固定是 `action`、`project_id`、`idempotency_key`；`idempotency_key` 每次新调用换一个新的 UUID，重试同一次改动才复用。
- `aixcut_frontend`：媒体类动作（media.*、timeline.export_range 等）把字段放进 `params`；页面类动作（activate_timeline、playback_check、export_timeline、capture_timeline_frames、page_status 等）字段放顶层。
- `aixcut_export` 的范围必须写成 `range:{start_ms,end_ms}` 对象，平铺的 `range_start_ms` 不被接受。
- `aixcut_timeline` 的 `duplicate` 用 `source_timeline_id` 指定被复制的那条轴，不是 `timeline_id`。
- `aixcut_timeline` 的 `undo`/`redo` 要先看 `history` 头部的 `operation_id`，不是任意历史都接受。
- 删除、清空、替换、整轴操作都会要求 `plan_context`；它必须是**完整对象**，传 `{}` 会被拒。

## plan_context 完整示例（可直接复制）

```json
{
  "plan_id": "<任意新 UUID>",
  "project_id": "<当前 project_id>",
  "timeline_id": "<当前 timeline_id>",
  "base_revision": <刚读到的 revision 数字>,
  "mode": "local_edit",
  "preserve": [],
  "delete_refs": [],
  "authorized_actions": ["aixcut_timeline.delete"]
}
```

- `mode` 用 `local_edit`（也可以用 `full_assembly`）；机械类动作才用 `mechanical`。
- `delete_refs` 写这次要删的片段/轨道 ref；**整条时间轴删除或清空时必须留空数组**，不要写 `timeline:<id>`。
- `authorized_actions` 写这次要做的动作全名，格式 `aixcut_<工具>.<action>`，例如 `aixcut_caption.delete`。
- `base_revision` 必须是刚读到的当前 revision，过期会被拒并提示当前值。

## 各工具字段

### aixcut_open

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `new_project` | `target`, `title` | `description` |
| `project` | `project_id`, `target` | — |
| `project_list` | `target` | — |
| `studio` | `target` | — |

### aixcut_read

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `audio` | `view` | `filters`, `kind`, `project_id`, `timeline_id`, `track` |
| `captions` | `view` | `filters`, `kind`, `project_id`, `timeline_id`, `track` |
| `clips` | `view` | `filters`, `kind`, `project_id`, `timeline_id`, `track` |
| `component` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `effect` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `effect_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `generator` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `generator_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `group` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `keyframe` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `keyframe_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `layout` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `layout_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `mask` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `mask_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `motion` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `motion_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `mutation_receipt` | `view` | `idempotency_key`, `mutation_id`, `project_id`, `request_hash`, `workflow_binding` |
| `node` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `project` | `view` | `project_id`, `timeline_id` |
| `refs` | `view` | `project_id`, `timeline_id` |
| `review` | `view` | `project_id`, `timeline_id` |
| `settings` | `view` | `project_id`, `timeline_id` |
| `source` | `view` | `project_id`, `ref`, `source` |
| `source_lines` | `view` | `filters`, `include`, `limit`, `offset`, `project_id`, `ref`, `selectors`, `source` |
| `sources` | `view` | `project_id` |
| `speech` | `view` | `project_id`, `timeline_id` |
| `style` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `style_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |
| `text` | `view` | `filters`, `kind`, `project_id`, `timeline_id`, `track` |
| `timeline` | `view` | `project_id`, `timeline_id` |
| `tracks` | `view` | `project_id`, `timeline_id` |
| `transition` | `view` | `owner`, `project_id`, `target`, `timeline_id`, `track` |
| `transition_catalog` | `view` | `ids`, `limit`, `offset`, `owner`, `project_id`, `timeline_id` |

### aixcut_primary

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `items` | `idempotency_key`, `plan_context`, `project_id`, `regenerate_captions`, `timeline_id` |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `reorder` | `order` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `replace` | `source`, `target` | `idempotency_key`, `plan_context`, `project_id`, `regenerate_captions`, `source_start_ms`, `timeline_id` |
| `set` | `items` | `idempotency_key`, `plan_context`, `project_id`, `regenerate_captions`, `timeline_id` |

### aixcut_speech

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `insert` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `replace` | `source`, `target` | `idempotency_key`, `plan_context`, `project_id`, `source_start_ms`, `timeline_id` |
| `reset` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `set` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `trim` | — | `duration_ms`, `end_ms`, `idempotency_key`, `plan_context`, `project_id`, `source_start_ms`, `target`, `targets`, `timeline_id` |

### aixcut_caption

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `items` | `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id` |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `duplicate` | `target` | `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id` |
| `highlight` | `highlight_ranges` | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `merge` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `separator`, `timeline_id` |
| `mode` | `mode` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `move` | `target`, `to_ms` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `regenerate` | — | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `split` | `target` | `at_ms`, `char_index`, `idempotency_key`, `node_id`, `plan_context`, `project_id`, `timeline_id`, `to_ms` |
| `style` | — | `highlight_ranges`, `idempotency_key`, `node_id`, `plan_context`, `project_id`, `style`, `target`, `targets`, `text`, `timeline_id`, `x`, `y` |
| `sync` | — | `idempotency_key`, `plan_context`, `project_id`, `source_track`, `timeline_id` |
| `update` | `target` | `duration_ms`, `enabled`, `highlight_ranges`, `idempotency_key`, `kind`, `label`, `node_id`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `style`, `text`, `timeline_id`, `x`, `y` |

### aixcut_clip

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `items` | `idempotency_key`, `kind`, `plan_context`, `project_id`, `start_ms`, `timeline_id`, `track` |
| `cut` | `end_ms`, `source_start_ms`, `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `duplicate` | `target` | `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id` |
| `fade` | — | `fade_in_ms`, `fade_out_ms`, `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `layout` | `target` | `box`, `fit`, `idempotency_key`, `opacity`, `plan_context`, `preset`, `project_id`, `timeline_id` |
| `move` | `target` | `duration_ms`, `enabled`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `timeline_id`, `to_ms`, `track`, `values` |
| `reorder` | `order`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `replace` | `source`, `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `retime` | `target` | `idempotency_key`, `plan_context`, `project_id`, `rate`, `timeline_id` |
| `set` | `items`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `split` | `target` | `at_ms`, `char_index`, `idempotency_key`, `node_id`, `plan_context`, `project_id`, `timeline_id`, `to_ms` |
| `time` | `target` | `duration_ms`, `enabled`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `timeline_id`, `to_ms`, `track`, `values` |
| `trim` | `target` | `duration_ms`, `end_ms`, `idempotency_key`, `plan_context`, `project_id`, `source_start_ms`, `timeline_id` |
| `update` | `target` | `duration_ms`, `enabled`, `fade_in_ms`, `fade_out_ms`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `timeline_id` |

### aixcut_text

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `items` | `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id`, `track` |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `duplicate` | `target` | `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id` |
| `merge` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `separator`, `timeline_id` |
| `move` | `target` | `duration_ms`, `enabled`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `timeline_id`, `to_ms`, `track`, `values` |
| `set` | `items`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `split` | `target` | `at_ms`, `char_index`, `idempotency_key`, `node_id`, `plan_context`, `project_id`, `timeline_id`, `to_ms` |
| `style` | — | `highlight_ranges`, `idempotency_key`, `node_id`, `plan_context`, `project_id`, `style`, `target`, `targets`, `text`, `timeline_id`, `x`, `y` |
| `update` | `target` | `duration_ms`, `enabled`, `highlight_ranges`, `idempotency_key`, `kind`, `label`, `node_id`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `style`, `text`, `timeline_id`, `x`, `y` |

### aixcut_audio

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `items` | `duration_ms`, `fade_in_ms`, `fade_out_ms`, `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id`, `track`, `volume` |
| `cut` | `end_ms`, `source_start_ms`, `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `detach_audio` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `duplicate` | `target` | `idempotency_key`, `plan_context`, `project_id`, `start_ms`, `timeline_id` |
| `fade` | — | `fade_in_ms`, `fade_out_ms`, `idempotency_key`, `plan_context`, `project_id`, `target`, `targets`, `timeline_id` |
| `move` | `target` | `duration_ms`, `enabled`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `timeline_id`, `to_ms`, `track`, `values` |
| `reorder` | `order`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `replace` | `source`, `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `restore_audio` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `retime` | `target` | `idempotency_key`, `plan_context`, `project_id`, `rate`, `timeline_id` |
| `set` | `items`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `split` | `target` | `at_ms`, `idempotency_key`, `plan_context`, `project_id`, `timeline_id`, `to_ms` |
| `time` | `target` | `duration_ms`, `enabled`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `timeline_id`, `to_ms`, `track`, `values` |
| `trim` | `target` | `duration_ms`, `end_ms`, `idempotency_key`, `plan_context`, `project_id`, `source_start_ms`, `timeline_id` |
| `update` | — | `duration_ms`, `enabled`, `idempotency_key`, `kind`, `label`, `plan_context`, `project_id`, `source_start_ms`, `start_ms`, `target`, `targets`, `timeline_id`, `values`, `volume` |

### aixcut_track

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `cleanup` | — | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `clear` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `timeline_id`, `track` |
| `delete` | — | `idempotency_key`, `plan_context`, `project_id`, `target`, `timeline_id`, `track` |
| `ensure` | — | `idempotency_key`, `kind`, `name`, `plan_context`, `project_id`, `role`, `timeline_id` |
| `reorder` | `order` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | — | `enabled`, `idempotency_key`, `kind`, `locked`, `muted`, `name`, `plan_context`, `project_id`, `role`, `target`, `timeline_id`, `track`, `values` |

### aixcut_effect

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | — | `category`, `context`, `enabled`, `idempotency_key`, `inputs`, `items`, `mix`, `owner`, `parameters`, `placement`, `plan_context`, `preset_id`, `preset_version`, `project_id`, `scope`, `timeline_id` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `reorder` | `ids`, `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items`, `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `category`, `context`, `enabled`, `idempotency_key`, `inputs`, `mix`, `parameters`, `placement`, `plan_context`, `preset_id`, `preset_version`, `project_id`, `scope`, `timeline_id` |

### aixcut_transition

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `duration_ms`, `from`, `to` | `alignment`, `easing`, `idempotency_key`, `parameters`, `plan_context`, `preset_id`, `preset_version`, `project_id`, `timeline_id`, `track` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `from`, `to` | `alignment`, `duration_ms`, `easing`, `idempotency_key`, `parameters`, `plan_context`, `preset_id`, `preset_version`, `project_id`, `timeline_id` |
| `update` | `target` | `alignment`, `duration_ms`, `easing`, `idempotency_key`, `parameters`, `plan_context`, `preset_id`, `preset_version`, `project_id`, `timeline_id` |

### aixcut_mask

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `owner` | `channel`, `coordinate_space`, `enabled`, `expansion`, `feather`, `idempotency_key`, `inverted`, `opacity`, `operation`, `parameters`, `path`, `plan_context`, `preset`, `project_id`, `source_clip`, `timeline_id` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `reorder` | `ids`, `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items`, `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `channel`, `coordinate_space`, `enabled`, `expansion`, `feather`, `idempotency_key`, `inverted`, `opacity`, `operation`, `parameters`, `path`, `plan_context`, `preset`, `project_id`, `source_clip`, `timeline_id` |

### aixcut_group

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `anchor_clip_id` | `clip_ids`, `group_type`, `idempotency_key`, `name`, `payload`, `payload_schema_version`, `plan_context`, `project_id`, `timeline_id` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `anchor_clip_id`, `clip_ids`, `group_type`, `idempotency_key`, `name`, `payload`, `payload_schema_version`, `plan_context`, `project_id`, `timeline_id` |

### aixcut_node

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `definition`, `node_id`, `owner` | `before_id`, `idempotency_key`, `parent_id`, `plan_context`, `project_id`, `timeline_id` |
| `delete` | `node_id`, `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `move` | `node_id`, `owner` | `before_id`, `idempotency_key`, `parent_id`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `definition`, `node_id`, `owner` | `before_id`, `idempotency_key`, `parent_id`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `definition`, `node_id`, `owner` | `before_id`, `idempotency_key`, `parent_id`, `plan_context`, `project_id`, `timeline_id` |

### aixcut_component

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `component_type`, `owner`, `payload` | `composition_definition_id`, `idempotency_key`, `instance_key`, `plan_context`, `project_id`, `schema_version`, `timeline_id` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items`, `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `composition_definition_id`, `idempotency_key`, `instance_key`, `payload`, `plan_context`, `project_id`, `schema_version`, `timeline_id` |

### aixcut_generator

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `preset_id` | `context`, `duration_ms`, `idempotency_key`, `inputs`, `label`, `parameters`, `plan_context`, `preset_version`, `project_id`, `start_ms`, `timeline_id`, `track` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `context`, `duration_ms`, `idempotency_key`, `inputs`, `label`, `parameters`, `plan_context`, `preset_id`, `preset_version`, `project_id`, `start_ms`, `timeline_id`, `track` |

### aixcut_motion

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `clear` | `owner` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `delete` | `owner`, `phase` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `reset` | `owner`, `phase` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `effect_capability`, `owner`, `phase` | `definition`, `idempotency_key`, `parameters`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `owner`, `phase` | `definition`, `effect_capability`, `idempotency_key`, `parameters`, `plan_context`, `project_id`, `timeline_id` |

### aixcut_keyframe

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `add` | `local_time_ms`, `owner`, `property_id`, `value`, `value_type` | `base_value`, `frame_index`, `idempotency_key`, `interpolation`, `plan_context`, `project_id`, `temporal_handle_mode`, `temporal_in_x`, `temporal_in_y`, `temporal_out_x`, `temporal_out_y`, `timeline_id` |
| `delete` | `target` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items`, `owner`, `property_id`, `value_type` | `base_value`, `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `base_value`, `frame_index`, `idempotency_key`, `interpolation`, `local_time_ms`, `owner`, `plan_context`, `project_id`, `property_id`, `temporal_handle_mode`, `temporal_in_x`, `temporal_in_y`, `temporal_out_x`, `temporal_out_y`, `timeline_id`, `value`, `value_type` |

### aixcut_layout

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `reset` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | — | `box`, `crop`, `fit`, `idempotency_key`, `items`, `opacity`, `plan_context`, `preset`, `project_id`, `rotation`, `scale`, `target`, `timeline_id` |

### aixcut_style

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `reset` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `set` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `update` | `target` | `idempotency_key`, `node_id`, `plan_context`, `project_id`, `style`, `timeline_id` |

### aixcut_arrange

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `close_gaps` | `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `delete` | `targets` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `delete_after` | `at_ms`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `delete_before` | `at_ms`, `track` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `duplicate` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |
| `move` | `items` | `idempotency_key`, `plan_context`, `project_id`, `timeline_id` |

### aixcut_transcript

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `find` | `query`, `source` | `limit`, `project_id` |
| `update` | `end_index`, `expected_revision`, `new_texts`, `sentence_id`, `source`, `source_file_revision`, `start_index` | `idempotency_key`, `project_id` |

### aixcut_agent_bootstrap

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `start` | `intent` | — |

### aixcut_project

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `canvas` | `project_id`, `timeline_id` | `fps`, `height`, `idempotency_key`, `plan_context`, `preset`, `width` |
| `clear` | `project_id` | `idempotency_key`, `plan_context`, `timeline_id` |
| `update` | `project_id`, `title` | `idempotency_key`, `plan_context`, `timeline_id` |

### aixcut_timeline

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `clear` | `timeline_id` | `idempotency_key`, `plan_context`, `project_id` |
| `create` | — | `fps`, `height`, `idempotency_key`, `name`, `preset`, `project_id`, `source_timeline_id`, `width` |
| `delete` | `timeline_id` | `idempotency_key`, `plan_context`, `project_id` |
| `duplicate` | `source_timeline_id` | `fps`, `height`, `idempotency_key`, `name`, `preset`, `project_id`, `width` |
| `history` | — | `project_id` |
| `list` | — | `project_id` |
| `receipt` | — | `idempotency_key`, `operation_id`, `project_id` |
| `redo` | `operation_id` | `idempotency_key`, `project_id` |
| `rename` | `name`, `timeline_id` | `idempotency_key`, `project_id` |
| `reorder` | `timeline_ids` | `idempotency_key`, `project_id` |
| `undo` | `operation_id` | `idempotency_key`, `project_id` |
| `update` | `timeline_id` | `fps`, `height`, `idempotency_key`, `name`, `preset`, `project_id`, `width` |

### aixcut_frontend

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `activate_timeline` | `timeline_id` | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `capture_source_frames` | `media_id`, `selections` | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `capture_timeline_frames` | `selections` | `expected_revision`, `params`, `project_id`, `timeline_id`, `timeout_ms`, `workspace_id` |
| `export_timeline` | — | `expected_revision`, `format`, `frame_rate`, `height`, `params`, `project_id`, `timeline_id`, `timeout_ms`, `width`, `workspace_id` |
| `export_timeline_status` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `import_local_media` | — | `params`, `project_id`, `timeout_ms`, `url`, `urls`, `workspace_id` |
| `import_status` | `import_ids` | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `list_documents` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.add` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.analyze` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.associate_remote` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.bind_local` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.capture_frame` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.copy_to_opfs` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.delete` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.delete_cloud` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.export_range` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.extract_audio` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.inspect` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.list` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.local_status` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.prepare_local` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.replace_source` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.resolve_cloud_url` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.save_to_disk` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `media.upload` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `operation.cancel` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `operation.get` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `operation.retry` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `page_status` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `playback_check` | `expected_revision`, `start_ms`, `target_ms`, `timeline_id` | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `prompt_add_document` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `prompt_add_material` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `timeline.capture_frame` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |
| `timeline.export_range` | — | `params`, `project_id`, `timeout_ms`, `workspace_id` |

### aixcut_export

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `cancel` | `job_id` | `project_id` |
| `get` | `job_id` | `project_id` |
| `submit` | `kind` | `format`, `idempotency_key`, `output`, `project_id`, `range`, `time_ms`, `timeline_id` |

### aixcut_media

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `complete_upload` | `file_id`, `session_id` | `project_id` |
| `prepare_upload` | `byte_size`, `file_name`, `mime_type`, `source_fingerprint` | `project_id` |
| `upload_status` | — | `file_id`, `project_id`, `session_id` |

### aixcut_upload_link

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `create` | — | `project_id` |
| `renew` | `upload_id` | `project_id` |
| `revoke` | `upload_id` | `project_id` |
| `status` | `upload_id` | `project_id` |

### aixcut_document

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `import` | `file_path` | `content`, `file_name`, `mime_type`, `project_id` |

### aixcut_generate

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `cancel` | `job_id` | `project_id`, `workflow_binding` |
| `catalog` | — | `kind`, `project_id` |
| `get` | `job_id` | `project_id`, `workflow_binding` |
| `list` | — | `limit`, `project_id` |
| `quote` | — | `input`, `kind`, `model`, `name`, `project_id`, `prompt`, `provider`, `workflow_binding` |
| `speech_edit` | `operation` | `all`, `items`, `project_id` |
| `speech_quote` | — | `all`, `model`, `project_id`, `segments`, `workflow_binding` |
| `speech_read` | — | `project_id` |
| `speech_submit` | `recovery` | `project_id`, `workflow_binding` |
| `submit` | — | `accepted_quoted_credits`, `idempotency_key`, `input`, `kind`, `model`, `name`, `project_id`, `prompt`, `provider`, `quote_confirmation`, `workflow_binding` |

### aixcut_review

| action | 必填字段 | 其他可用字段 |
| --- | --- | --- |
| `project` | `view` | `project_id`, `timeline_id` |
| `renderability` | `view` | `project_id`, `timeline_id` |
| `timeline` | `view` | `project_id`, `timeline_id` |

