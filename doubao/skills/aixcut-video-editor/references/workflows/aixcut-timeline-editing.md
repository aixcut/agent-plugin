# 时间线编辑

按计划执行 Aixcut 时间线、Clip、文字、音频和轨道编辑。

## 最短路径

1. 读取本次编辑需要的全部视图，只使用返回的稳定引用，不猜 ID。
2. 为每个新的写入意图生成新的 UUID v4 幂等键。
3. 选择范围最窄的 Tool 和 action，按声明的字段提交。
4. 写入成功后立刻回读受影响视图；需要确认结构或画面时调用 `aixcut_review`。
5. 报告真实返回的 `status`、`mutation_id`、`revision_after`、`created`、`removed` 和 `warnings`。

## 批量写入

- 一个 action 在一个轨道上只发一次调用：把整组元素放进 `items[]`，或把全部目标放进 `targets`。`aixcut_clip`（`fade`/`delete`）、`aixcut_text`（`style`/`delete`）、`aixcut_caption`（`style`/`highlight`/`delete`）、`aixcut_audio`（`fade`/`update`/`delete`）、`aixcut_primary` 均支持 `targets: [...]` 一次原子批量生效，不要逐条循环调用。
- 每个 item 有独立时间、样式或高亮时，把这些值放进对应 item，不要拆成逐条调用；只有修正已经落库的单个对象时才使用单目标 action。
- `aixcut_layout(action="update")` 只接受一个 `target`；批量摆放画面用 `aixcut_layout(action="set", items=[...])`，不要把 `items` 传给 `update`。
- 结构尚未冻结时，`aixcut_primary` 的 `set`、`add`、`replace` 传 `regenerate_captions=false`；冻结后再统一生成字幕。
- 不同 action、不同轨道、不同领域不要合并到一次调用。
- 同一时间线不要并发执行结构写入。
- 时间线未变化时可以复用最近一次读取；位置相关的命令前、每个原子批次后要重新读取。

可写 clip kind 只有 `video`、`audio`、`text`、`motion-graph`、`effect`。图片统一使用 `kind="video"`，不要创建 `graphic` 或 `composition`，它们不是当前 MCP 可投影、截帧和渲染的公开输入。
- `created` 返回 `{ id, ref, type }` 类型化条目；创建字幕或文字时可能同时包含 clip 行和 component 行，统计实际片段数只计 `clip:`。

## Tool 选择

| 意图 | Tool |
| --- | --- |
| 读取或检查 | `aixcut_read`、`aixcut_review` |
| 主视频序列 | `aixcut_primary` |
| 语音段落 | `aixcut_speech` |
| 视频、图片、动效片段 | `aixcut_clip` |
| 普通画面文字 | `aixcut_text` |
| 音乐、音效、已放置的配音 | `aixcut_audio` |
| 画面位置、文字样式 | `aixcut_layout`、`aixcut_style` |
| 批量删除、复制、移动、闭合间隙、按播放头裁切 | `aixcut_arrange` |
| 轨道 | `aixcut_track` |
| 版本与时间线 | `aixcut_timeline` |
| 画布或整项目清理 | `aixcut_project` |
| 页面动作 | `aixcut_frontend` |

`aixcut_speech` 只编辑主语音轨；`aixcut_text` 不编辑字幕。结构变化后，位置相关命令必须重新读取。

用户要保留原片再做一个新版本、做横竖屏适配、或做 A/B 两版时，先用 `aixcut_timeline(action="list")` 看现有时间线，再用 `aixcut_timeline(action="duplicate", source_timeline_id=...)` 复制一份；`create` 只在用户明确要空白时间线时使用。创建或复制完成后，必须确认 `data.active_timeline_id` 等于新的 `timeline_id`；缺失该字段或返回 `TIMELINE_ACTIVATION_DEFERRED` 时，调用 `aixcut_frontend(action="activate_timeline", timeline_id=...)` 并确认 `status="ready"`。选定 `timeline_id` 后，该版本的每次读取、编辑、截帧和检查都要带上它。单版本需求不要额外建时间线。

画布 preset 的合法值固定为：`landscape`/`fhd`/`fullhd`/`1080p` = 1920×1080，`portrait`/`vertical` = 1080×1920，`square` = 1080×1080，`hd`/`720p` = 1280×720，`uhd`/`4k` = 3840×2160。未知 preset 返回 `MCP_CANVAS_PRESET_INVALID`，不会静默忽略。`aixcut_timeline(action="create")` 不接受画布字段；先创建，再调用 `aixcut_timeline(action="update")` 设置画布。读取 `clips`、`captions`、`text`、`audio` 时优先用顶层 `track`、`kind`，旧的 `filters.track_id`、`filters.kind` 也兼容。

## 元素与图层

- 字幕轨只放 spoken words 或用户提供的字幕文案。配料标注、箭头、圆圈、标题等视觉元素不是字幕。
- 静态标注用 `aixcut_text` 放在非字幕文字轨；已有动效素材用 `aixcut_clip(action="add", kind="motion-graph")` 放在视频覆盖轨。
- 添加前读取轨道列表，按 `kind` 和 `role` 选择轨道并显式传 `track`；写入后回读确认 `kind`、`track_id` 和 `role`。放错图层要移动或修正，不能删除元素掩盖问题。
- 放置字幕底板、贴纸、徽标或 CTA 前先确定层级和安全区；重叠时底板必须位于字幕文字下方，且不能遮住优先级更高的贴图，最终层级确定后抽查真实合成帧。

## 画布、音频与轨道

- 新项目画布可能是 `0×0`：首个视觉写入决定尺寸，无素材时服务端回退 `1920×1080` 并返回 `MCP_CANVAS_DEFAULTED`；需要竖屏时用 `aixcut_project(action="canvas")` 明确设置。
- 音乐、音效、渲染后配音通过 `aixcut_audio(action="add")` 加入。音乐用 `fade_in_ms`、`fade_out_ms`；音量不是 add 字段，添加后读取 clip 引用再 `aixcut_audio(action="update", target="clip:...", volume=0.2-0.4)`。
- 需要保留视频原声时，先调用 `aixcut_frontend(action="media.extract_audio", params={media_id: ..., expected_file_revision: ...})`，再用 `aixcut_frontend(action="operation.get", params={operation_id: ...})` 轮询到成功，然后把返回的音频素材加入音频轨。`media.*` 与 `operation.*` 的参数必须放在 `params` 里，顶层平铺字段会被判 `MCP_ARGUMENTS_INVALID`。
- 静音视频片段前先读取它的组件结构；没有 `audio` 组件或音频 payload 时说明其本来无音轨，不要调用 `aixcut_audio(action="update")`，也不要猜音频引用。
- Agent 自己持有文件且不依赖页面选择时，先计算 SHA-256，调用 `aixcut_media(action="prepare_upload")`，把完全相同的字节 PUT 到返回地址，再调用 `aixcut_media(action="complete_upload")` 并用 `upload_status` 查询入库。不要把本机路径当作页面可读取路径。
- 需要读取本机文件时，先尝试启动有头浏览器和本机桥。只有启动或连接失败、页面能力不可用时，才自动降级为临时上传链接：调用 `aixcut_upload_link(action="create")`，把返回链接展示为二维码或链接，再用 `aixcut_upload_link(action="status", upload_id=...)` 跟踪同一上传。不要询问用户选择桥还是上传链接。
- 加音频前用 `aixcut_track(action="ensure")` 确认轨道；原声、AI 配音、BGM、音效各用独立轨道。

声音可以跨镜头连续推进：如果人声、现场声或音乐能承接上一镜，就不要每次切镜都重启 BGM 或重复加音效。音乐按真实内容终点裁切或淡出，不能越过素材来源时长假装循环；需要 J-cut、L-cut 或跨镜头铺底时使用独立音频片段并回读实际范围。

短音效只在能让动作、转场或结果更容易理解或更有反馈时添加，不要给每条字幕或每个切点机械配 click、whoosh 或 impact。先确定画面事件、音效文件里的同步点和专用音效轨，再让同步点落在事件时刻；写入后回读时间范围，并和对白一起试听。没有合适素材或试听证据时，标记为未验证，不把“已经放上去”当成质量通过。

## 幂等与状态

- `applied`、`noop`、`applied_with_warning` 按字面含义处理；`duplicate: true` 表示幂等键重放了先前的成功写入。
- `status_unknown` 时保留全部原始参数并复用同一 UUID。
- `NLE_IDEMPOTENCY_CONFLICT` 表示同一键用于了不同目标：先检查时间线，再用新 UUID 重做。
- 字幕或文字 `update` 只改 `start_ms`、`duration_ms` 等片段列时，不需要提供文字组件字段；只有改 `text`、`style`、`x`、`y` 时才写组件。

## 画面位置

- 画面位置用 `aixcut_layout`：`update` 改一条、`set` 一次摆一批、`reset` 回到自动居中。位置来自 `preset` 或 `box`（0–1 画布比例，二者互斥），还可以只改 `fit`（`contain`、`cover`、`fill`、`none`）、`opacity`、`rotation`、`scale`、`crop`（四边比例）而保持当前位置。
- `aixcut_clip(action="layout")` 保留旧契约：只传 `preset` 或 `box` 之一，外加 `fit`、`opacity`。旋转、缩放、裁剪和批量摆放只走 `aixcut_layout`。
- 改布局前先读 `aixcut_read(view="layout")`；`layout_catalog` 给出命名的位置和取值范围。
- 修改布局后捕获一帧，把每个 composition 条目对应到引用。可见画面变化、字幕位置或图层关系变化时必须看帧。

## 文字样式

- 文字和字幕落库是 Composition 作者树，样式用 `aixcut_style` 写：`update` 合并、`set` 批量、`reset` 回到该用途的默认样式。
- 多条文字统一样式必须调用 `aixcut_style(action="set", items=[{target, style}, ...])`；`update` 只处理单个 target，不接受 `items` 或 `targets`。
- 文字时间、时长和标签直接作为 `aixcut_text(action="update")` 的顶层字段传入：`target`、`start_ms`、`duration_ms`、`label`。不存在 `action="time"`，也不使用 `values` 包装。
- 只接受白名单键：`typography`（`font`、`sizePx`、`lineHeight`、`letterSpacingPx`、`wordSpacingPx`、`language`、`textCase`、`direction`、`features`、`baselineShiftPx`）、`appearance`（`fill`、`strokes`、`shadows`、`glow`），以及简写 `fontSize`、`lineHeight`、`letterSpacing`、`maxWidth`、`textAlign`、`color`、`strokeColor`、`strokeWidth`、`shadowColor`、`shadowBlur`、`shadowOffsetX`、`shadowOffsetY`、`x`、`y`、`highlightStyle`（仅 `color`）。
- 一个 Composition 里有多个文字节点时，先读 `aixcut_read(view="style")` 拿 `node_id` 再写。

## 批量编排与原声分离

- 多条片段一起改时用 `aixcut_arrange`：`delete`、`duplicate`、`move`、`close_gaps`、`delete_before`、`delete_after`。整批是一个原子事务，某项被拒就整体回滚。
- 跨播放头的片段是就地裁短，不是整条删除；换轨要求同类型轨道。
- 需要把视频原声拆出来编辑时用 `aixcut_audio(action="detach_audio", targets=[...])`，画面保留、原声成为独立音频片段；`restore_audio` 打开视频原声并**保留**已拆出的音频。两者都可重复调用。
