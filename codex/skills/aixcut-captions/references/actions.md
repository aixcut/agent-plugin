# 字幕动作表

本文件是 `aixcut-captions` 的参数查表，只回答"哪个动作要填哪些字段"。来源判定、时间对齐和完成判定以主 Skill 为准。

## 通用字段

- `project_id`：可选；省略时用当前 Project。
- `idempotency_key`：可选；省略时服务端自动生成并在结果中返回。重试完全相同请求时复用结果里的 key，新的写入意图不要复用旧 key。
- `target`：来自 `aixcut_read` 的稳定 ref 或 id，禁止猜 ID。
- `items`：字幕数组，元素字段由服务端 Schema 校验。
- 每个 Tool 都是严格对象：**只发本表列出的字段**，多余字段直接报错。
- `style` 只认编辑器文字样式键，键名见 `aixcut-timeline-editing` 的动作表；写表外的键名直接报错。

## 动作表

| Tool | action | 必填（`action` 之外） | 可选 | 说明 |
| --- | --- | --- | --- | --- |
| aixcut_caption | mode | `mode` | — | 设置字幕模式：`auto` 跟随主视频轨（重建整轨并覆盖手写内容），`manual` 自由编辑 |
| aixcut_caption | regenerate | — | — | 按视频片段的逐字稿重建整轨字幕；没有逐字稿时会返回空结果加警告 |
| aixcut_caption | set | `items` | — | 整体替换全部字幕 |
| aixcut_caption | add | `items` | `start_ms` | 在字幕轨追加字幕，不给起点就接在末尾 |
| aixcut_caption | update | `target` | `text`、`values`、`style`、`highlight_ranges`、`x`、`y`、`enabled`、`duration_ms` | 更新一条字幕的字段和内容 |
| aixcut_caption | delete | `target` | — | 删除一条字幕 |
| aixcut_caption | split | `target` | `at_ms`、`char_index`、`to_ms` | 按时间或字符位置把一条拆成两条 |
| aixcut_caption | style | `target` | `style`、`highlight_ranges`、`x`、`y` | 更新字幕样式和位置 |
| aixcut_caption | highlight | `target` | `highlight_ranges` | 更新字幕高亮，`highlight_ranges` 是 `{ start, end }` 字符区间数组 |

## 字幕模式

- 写入、改文案、拆条、删除、样式和高亮这些手写动作会把字幕轨切成 `manual`，浏览器不再自动重建这一轨；这是预期行为，不需要额外调 `mode`。
- `regenerate` 不改模式：它本身就是按逐字稿重建整轨。
- 只有要恢复自动跟随时才用 `mode` 的 `auto`，它会重建整轨并覆盖已有手写字幕。
- 当前模式从 `aixcut_read` 的 `captions` 视图读 `mode` 字段，取值 `auto` 或 `manual`。

## 整段写入示例

旁白型成片把配音文稿切成字幕时，一次写完，每条带自己的起点和时长：

```json aixcut_caption
{
  "action": "set",
  "idempotency_key": "7d3f0b6e-3d2a-4c9f-9d5c-6a1b2c3d4e5f",
  "items": [
    { "text": "有些风景，只在路上等你。", "start_ms": 0, "duration_ms": 3200 },
    { "text": "清晨的森林，第一缕阳光穿过树梢。", "start_ms": 3200, "duration_ms": 3600 }
  ]
}
```
