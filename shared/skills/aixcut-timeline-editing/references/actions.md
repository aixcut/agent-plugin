# 编辑工具动作表

本文件是 `aixcut-timeline-editing` 的参数查表，只回答「哪个动作要填哪些字段」。调用规则、幂等语义、完成判定以主 Skill 为准。

## 通用字段

- `project_id`：可选；省略时用当前打开的 Project。
- `idempotency_key`：可选；省略时服务端自动生成并在结果中返回。重试完全相同请求时复用结果里的 key，新的写入意图不要复用旧 key。
- `target` / `targets`：来自 `aixcut_read` 的稳定 ref 或 id，禁止猜 UUID。
- `items`：数组，元素字段由服务端 Schema 校验；读取返回的 ref 可以原样回填。
- `timeline_id`：目标时间轴 UUID。多版本任务必须在每次读取、编辑、截帧和审查时带上；单版本可省略并使用默认时间轴。
- 每个 Tool 都是严格对象：**只发本表列出的字段**，多余字段直接报错。

## 字段组

| 组 | 字段 |
| --- | --- |
| 时间 | `source_start_ms`、`start_ms`、`duration_ms`、`end_ms`、`at_ms`、`to_ms`、`rate` |
| 列 | `enabled`、`label`、`kind`、`volume`、`values` |
| 淡入淡出 | `fade_in_ms`、`fade_out_ms` |
| 文字 | `text`、`style`、`highlight_ranges`、`x`、`y` |
| 目标 | `target`、`targets` |
| 轨道 | `track` |

字段和片段类型必须匹配，传错直接报错，不会静默写进没人读的位置：

| 字段 | 谁能用 | 落库位置 |
| --- | --- | --- |
| `style` | 文字、字幕 | `textData.styleOverrides`，键名只能取下方样式键表里的名字，写表外的键名直接报错 |
| `highlight_ranges` | 文字、字幕 | `textData.highlightRanges`，元素是 `{ start, end }` 字符下标区间 |
| `x`、`y` | 文字、字幕 | 文字位置，0–1 的画布比例 |
| `volume` | 音频、视频 | 播放音量，0–1 |
| `values` | 全部 | 所在表的列覆盖，只认该表列名，写错列名直接报错 |

`style` 的键名是封闭清单，编辑器只读这些键，其余键以前会被静默丢弃，现在直接报错：

| 分类 | 样式键 |
| --- | --- |
| 字体 | `fontSize`、`fontFamily`、`fontWeight`、`fontStyle`、`lineHeight`、`letterSpacing`、`maxWidth`、`textAlign` |
| 颜色与描边 | `color`、`strokeColor`、`strokeWidth`、`backgroundColor`、`shadowColor`、`shadowBlur`、`shadowOffsetX`、`shadowOffsetY` |
| 位置与外观 | `x`、`y`、`appearance`、`highlightStyle`、`transform`、`animation` |

不写 `style` 就保留原有样式；只写要改的键即可，未列的键不会被清零。

画面位置用 `aixcut_clip` 的 `layout` 动作，位置只能二选一给：`preset` 或 `box`。

| 字段 | 含义 |
| --- | --- |
| `preset` | 常用位置：`full` 全屏、`left-half` 左半屏、`right-half` 右半屏、`lower-third` 下三分、`pip-top-left`/`pip-top-right`/`pip-bottom-left`/`pip-bottom-right` 画中画四角 |
| `box` | 自由位置，`{ x, y, width, height }` 全是 0–1 的**画布比例**，`x`/`y` 是左上角 |
| `fit` | 画面在框里怎么填：`contain`（默认，保持比例留边）、`cover`（铺满并裁切）、`fill`（拉伸）、`none`（原始像素居中） |
| `opacity` | 不透明度，0–1；不填沿用片段当前值 |

`preset` 和 `box` 只能给一个，两个都给或都不给都会报错。画中画四角自带 4% 边距，比例盒可以 `box: { x: 0.62, y: 0.62, width: 0.34, height: 0.34 }` 这样微调。`fit` 和 `opacity` 是修饰项，不给就保持原样。

读片段时位置会讲回同一套说法，存在 `visual_position` 里：对得上预设就是 `{ "preset": "pip-bottom-right", "fit": "contain", "opacity": 1 }`，自由位置是 `{ "box": { "x": 0.1, "y": 0.2, "width": 0.4, "height": 0.5 }, ... }`，`{ "auto": true }` 表示编辑器还在自动摆放、存的像素矩形不生效。改位置前先读它，不要自己拿像素反算。

改完位置必须截一次帧确认遮挡：`aixcut_frontend(capture_timeline_frames)` 的返回带 `composition` 名册（每条片段的 ref、时间范围和 `visual_position`），拿它把画面里的元素和 ref 对上。发现压住主体或字幕就再调一次位置。只改时间、音量、淡入淡出、字幕文案时不要截帧，画面不会变。

缩放、旋转、锚点当前不开放：预览和导出的算法不一致，开放会做出预览与成片不同的结果。要改画面大小，用 `box` 的 `width`/`height` 或换成别的 `preset`。

淡入淡出也是具名字段：

| 字段 | 含义 | 单位 |
| --- | --- | --- |
| `fade_in_ms` | 片段开头淡入时长 | 毫秒 |
| `fade_out_ms` | 片段结尾淡出时长 | 毫秒 |

两个字段都只写需要的那个，不写等于 0，即不淡化。音乐片段按片段类型自动换算：音频片段落到 `audioFadeInMs`/`audioFadeOutMs`，视频片段落到 `videoFadeInMs`/`videoFadeOutMs`，不需要手动填存储键。文字和字幕片段没有淡入淡出，传了会直接报错。文字和字幕片段落库时按目标轨道自动带上 `purpose`（字幕轨是 `caption`，文字轨是 `art-text`），调用方不需要填。音乐铺满整片时两端都要给值，否则开头结尾会很突兀。

```json aixcut_audio
{
  "action": "fade",
  "idempotency_key": "b7f0c2a4-9d31-4e6b-8c2f-1a5d3e7b9c01",
  "target": "clip:12",
  "fade_in_ms": 300,
  "fade_out_ms": 500
}
```

## 动作表

| Tool | action | 必填（`action` 之外） | 可选 | 说明 |
| --- | --- | --- | --- | --- |
| aixcut_primary | set | `items` | — | 用 `items` 整体替换主视频轨 |
| aixcut_primary | add | `items` | — | 在主视频轨末尾追加 |
| aixcut_primary | replace | `target`、`source` | 时间 | 换掉一个主轨片段的素材来源 |
| aixcut_primary | delete | — | 目标 | 删除主轨片段，用 `target` 或 `targets` 指定 |
| aixcut_primary | reorder | `order` | — | 重排全部主轨片段，`order` 必须是完整列表 |
| aixcut_speech | set | `items` | — | 整体替换口播序列 |
| aixcut_speech | insert | `items` | — | 在口播序列末尾追加 |
| aixcut_speech | delete | — | 目标 | 删除口播片段 |
| aixcut_speech | replace | `target`、`source` | 时间 | 换掉一个口播片段的素材来源 |
| aixcut_speech | trim | — | 目标、时间 | 裁切口播片段；不给目标时裁剪全部视频片段 |
| aixcut_speech | reset | — | 目标 | 把口播片段恢复成完整素材范围 |
| aixcut_clip | add | `items` | `kind`、`start_ms`、轨道 | 往轨道加视频、图片或 Motion Graph 片段 |
| aixcut_clip | duplicate | `target` | `start_ms` | 连同组件复制一个片段 |
| aixcut_clip | replace | `target`、`source` | — | 换掉片段的素材来源 |
| aixcut_clip | delete | `target` | — | 连同组件删除一个片段 |
| aixcut_clip | trim | `target` | 时间 | 在素材范围内裁剪片段 |
| aixcut_clip | split | `target` | `at_ms`、`char_index`、`to_ms` | 把一个片段拆成两个 |
| aixcut_clip | move | `target` | 轨道、时间、列 | 把片段移到别的时间或轨道 |
| aixcut_clip | time | `target` | 轨道、时间、列 | 改片段在时间轴上的位置 |
| aixcut_clip | retime | `target` | `rate` | 改播放速率，时间轴时长不变 |
| aixcut_clip | fade | `target` | 淡入淡出 | 更新片段的淡入淡出 |
| aixcut_clip | layout | `target` | `preset` 或 `box`、`fit`、`opacity` | 摆放画面片段的位置和大小 |
| aixcut_clip | update | `target` | 列、时间、淡入淡出 | 更新片段字段、淡入淡出和列覆盖 |
| aixcut_text | add | `items` | `start_ms`、轨道 | 往文字轨加文字片段 |
| aixcut_text | update | `target` | 列、时间、文字 | 更新文字片段的字段和内容 |
| aixcut_text | delete | `target` | — | 删除一个文字片段 |
| aixcut_text | split | `target` | `at_ms`、`char_index`、`to_ms` | 按时间或字符位置拆分文字 |
| aixcut_text | style | `target` | 文字 | 更新文字样式、高亮和位置 |
| aixcut_text | duplicate | `target` | `start_ms` | 复制一个文字片段 |
| aixcut_text | move | `target` | 轨道、时间、列 | 把文字片段移到别的时间或轨道 |
| aixcut_audio | add | `items` | `start_ms`、`duration_ms`、`fade_in_ms`、`fade_out_ms`、轨道 | 往音频轨加音频片段；顶层时长和淡入淡出作为每个 item 的默认值，item 可覆盖 |
| aixcut_audio | update | `target` | 列、时间、`volume` | 更新音频片段字段和音量 |
| aixcut_audio | replace | `target`、`source` | — | 换掉音频片段的素材来源 |
| aixcut_audio | delete | `target` | — | 删除一个音频片段 |
| aixcut_audio | trim | `target` | 时间 | 在素材范围内裁剪音频片段 |
| aixcut_audio | split | `target` | `at_ms`、`to_ms` | 拆分音频片段 |
| aixcut_audio | move | `target` | 轨道、时间、列 | 移动音频片段 |
| aixcut_audio | time | `target` | 轨道、时间、列 | 改音频片段的时间轴位置 |
| aixcut_audio | retime | `target` | `rate` | 改播放速率，时间轴时长不变 |
| aixcut_audio | fade | `target` | 淡入淡出 | 更新音频的淡入淡出 |
| aixcut_track | ensure | — | `kind`、`role`、`name` | 确保指定 kind 和 role 的轨道存在 |
| aixcut_track | update | — | `target`、轨道、`kind`、`role`、`name`、`enabled`、`locked`、`muted` | 更新轨道可编辑字段 |
| aixcut_track | clear | — | `target`、轨道 | 清空轨道上的片段但保留轨道 |
| aixcut_track | delete | — | `target`、轨道 | 删除轨道及其片段和组件 |
| aixcut_project | canvas | — | `preset`、`width`、`height`、`fps` | 更新画布预设、尺寸或帧率，显式 `width`/`height` 优先 |
| aixcut_project | clear | — | — | 删除当前 Project 的全部片段和配音段 |
| aixcut_timeline | list | — | — | 列出 Project 的全部独立时间轴 |
| aixcut_timeline | create | — | `name`、`source_timeline_id` | 创建空白时间轴，或按 source 复制 |
| aixcut_timeline | duplicate | `source_timeline_id` | `name` | 复制完整时间轴作为新版本 |
| aixcut_timeline | rename | `timeline_id`、`name` | — | 修改时间轴名称 |
| aixcut_timeline | delete | `timeline_id` | — | 删除时间轴，至少保留一条 |
| aixcut_timeline | reorder | `timeline_ids` | — | 按完整列表调整时间轴顺序 |
| aixcut_frontend | capture_source_frames | `media_id`、`selections` | `timeout_ms`、`workspace_id` | 从某个素材抓 1 到 8 张 JPEG 帧 |
| aixcut_frontend | capture_timeline_frames | `selections` | `timeline_id`、`expected_revision`、`timeout_ms`、`workspace_id` | 从指定时间轴抓 1 到 8 张 JPEG 帧 |
| aixcut_frontend | import_local_media | `url` 或 `urls`（二选一） | `timeout_ms`、`workspace_id` | 从本机桥取 1 到 8 份素材，受理即回，回包带 `import_ids` |
| aixcut_frontend | import_status | `import_ids` | `timeout_ms`、`workspace_id` | 按 `import_id` 查导入进度，`settled` 且 `private_copy` 非 `copying` 才算收尾 |
| aixcut_frontend | prompt_add_material | — | `timeout_ms`、`workspace_id` | 显示一次上传区域，文件由用户自己选择 |

`import_local_media` 和 `prompt_add_material` 都只回报受理，不回报入库结果。两者的查法不同：`import_local_media` 回包带 `import_ids`，用 `import_status` 按 id 查进度直到 `settled` 且 `private_copy` 不再是 `copying`；`prompt_add_material` 的素材由用户手选，没有 id，只能回读 `aixcut_read view=sources`。详见 SKILL.md 的「受理之后只有一套确认步骤」。

`import_local_media` 单文件用 `url`，多文件用 `urls`（一次最多 8 个，整批一次受理）；多文件回包给 `file_names`，某个文件取不到时该文件进 `failures`，其余照常受理。

页内导出（`export_timeline`、`export_timeline_status`）也属于 `aixcut_frontend`，但归 `aixcut-export` 管，不在本表。

## 完整请求示例

```json aixcut_clip
{
  "action": "trim",
  "idempotency_key": "8c1f0b6e-3d2a-4c9f-9d5c-6a1b2c3d4e5f",
  "target": "clip:3",
  "source_start_ms": 1200,
  "duration_ms": 2400
}
```


```json aixcut_frontend
{
  "action": "prompt_add_material"
}
```
