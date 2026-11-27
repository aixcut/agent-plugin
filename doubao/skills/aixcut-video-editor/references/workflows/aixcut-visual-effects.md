# 视觉增强与结构编辑

## 适用范围

效果、转场、蒙版、分组、组合节点、组件、生成器、对象动画和关键帧。不要把这些写入 `aixcut_clip` 的自由参数袋。

## 最短路径

1. 读取对应对象 view；修改已有实例时使用返回的稳定 ref。
2. 新增预设前读取 `effect_catalog`、`transition_catalog`、`mask_catalog`、`generator_catalog` 或 `motion_catalog`，不猜 preset id 与参数。目录默认是摘要分页；用 `offset/limit` 和 `has_more/next_offset` 逐页选择，只在需要完整定义时用 `ids`，单次最多 200 个 id。
3. 用最窄的 Tool/action 提交一个原子批次；每次新修改使用新的 UUID `idempotency_key`。
4. 回读受影响 view，确认 created、removed、refs、revision 和 adjustments。
5. 结构检查通过后用 `aixcut_frontend` 的 `capture_timeline_frames` 和 `playback_check` 验收画面与运动；静态结构不是视觉质量证明。

## 动效验收

动效、转场、动画和关键帧至少需要两个不同时刻的真实合成帧作为证据：单帧不能证明运动方向、缓动和时序是否正确。记录实际使用的时间点；只检查了一帧时，运动质量标为 `unjudgeable`，不能按通过处理。

## 领域规则

| 意图 | Tool |
| --- | --- |
| 滤镜、调色、模糊、故障 | `aixcut_effect` |
| 相邻片段转场 | `aixcut_transition` |
| 形状、路径、Clip matte | `aixcut_mask` |
| 锚点联动分组 | `aixcut_group` |
| 组合内部作者节点 | `aixcut_node` |
| Clip / Track 组件 | `aixcut_component` |
| 纯色、渐变等无来源片段 | `aixcut_generator` |
| 入退场、循环和强调动画 | `aixcut_motion` |
| 属性关键帧 | `aixcut_keyframe` |

- 转场只允许同一轨道、首尾相接的相邻 Clips。返回 `adjustments` 时必须说明实际时长和对齐，不把缩短后的结果说成原请求。
- 蒙版只能有一个明确 source：内建 `preset`、`source_clip` 或 `path` 三选一。
- 分组 anchor 必须是成员；删除分组不删除 Clips。
- `set` 是替换某个 owner 的完整集合；能用稳定实例身份时优先 `add`、`update`、`delete`。
- `aixcut_motion` 只用于没有 composition 内容的真实视频 Clip。文本 Clip、图片 Composition 或带 `composition`/`text-content` 的 Clip 会返回 `MCP_MOTION_CLIP_UNSUPPORTED`，应改用该 Clip 自己的 composition 动画模型。
- 结构写入后再次读取。未知提交结果先查 `mutation_receipt`，不换幂等键重放。
