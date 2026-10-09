# 配音动作表

本文件说明 `aixcut_voice` 各动作的字段。所有对象都是严格 Schema，多余字段会报错。

## 通用字段

- `project_id`：可选；省略时使用当前 Project。
- `idempotency_key`：UUID；工具会自动生成。只有重试同一操作时才复用；新的生成意图使用新 key。
- `target` / `targets`：来自 `aixcut_read` 的 Voice ref 或 id，不要猜 ID。
- `items`：配音段数组。

## 配音参数

| 字段 | 含义 |
| --- | --- |
| `text` | 配音文稿 |
| `speaker` | 说话人标识 |
| `voice_profile_id` | 来自 Voice `profiles` 的音色 ID |
| `emotion` | `auto`、`happy`、`sad`、`angry`、`fearful`、`disgusted`、`surprised`、`calm`、`neutral` |
| `speed` | `0.5`、`0.75`、`1`、`1.25`、`1.5`、`1.75`、`2` |
| `volume` | 0 到 1 |

## 动作

| Tool | action | 必填（不含 `action`） | 可选 | 说明 |
| --- | --- | --- | --- | --- |
| aixcut_voice | set | `items` | — | 替换全部配音段 |
| aixcut_voice | add | `items` | — | 追加配音段 |
| aixcut_voice | update | — | `target`、`targets`、`text`、`speaker`、`voice_profile_id`、`emotion`、`speed`、`volume`、`values` | 修改配音段 |
| aixcut_voice | delete | — | `target`、`targets` | 删除配音段 |
| aixcut_voice | reorder | `order` | — | 按完整列表重排配音段 |
| aixcut_voice | render | `targets` | `force`、`place`、`start_ms`、`gap_ms`、`track`、`timeout_ms` | 完整生成；可选重建配音音轨 |
| aixcut_voice | settings | — | `target`、`targets`、`default_speaker`、`default_voice_profile_id`、`default_emotion`、`default_speed`、`default_volume`、`values` | 无目标时改默认值，否则改指定片段 |

## 渲染示例

只生成音频：

```json aixcut_voice
{
  "action": "render",
  "targets": ["v1", "v2"]
}
```

生成后按间隔 300 毫秒铺到指定音轨：

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

返回包含每段生成结果，以及 `placement` 的 `applied`、`not_requested` 或失败状态。部分片段失败时不铺轨；超时后用原 `idempotency_key` 重试。
