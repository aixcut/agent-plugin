# 生成 Provider 参数表

本文件是 `aixcut-generation` 的参数查表，只回答「生成要填哪些字段」。轮询节奏、终态判定和落位要求以主 Skill 为准。

## 通用字段

- `project_id`：可选；省略时用当前打开的 Project。
- `idempotency_key`：`aixcut_generate(action="submit")` 可选；省略时服务端自动生成并在结果中返回。重试相同提交时复用结果里的 key。
- `provider` 和 `model`：省略时用服务端默认值，只在用户明确要求时覆盖。
- `input`：Provider 私有参数的对象，键名见下表；多余或拼错的键不会报错，只会被 Provider 忽略。

## kind 与默认 Provider

| kind | 默认 provider | 默认模型 | 实际处理 |
| --- | --- | --- | --- |
| `image` | `image2` | `gpt-image-2` | 图片生成或图片编辑 |
| `video` | `kling` | `kling-3` | 文生视频或图生视频；`kling-v3` 是兼容别名 |
| `music` | `minimax` | `music-2.5+` | 服务端按音频处理 |

默认值来自服务端配置，可能随环境调整；`kind` 也可以写在 `input.kind` 或 `input.media_type` 里，三者取第一个非空值。

## input 参数

### image2

| 键 | 必填 | 说明 |
| --- | --- | --- |
| `prompt` | 是 | 生成或编辑提示词 |
| `mode` | 否 | `generate`（默认）或 `edit` |
| `reference_images` | `edit` 时必填 | 参考图 URL 数组 |
| `size` | 否 | 例如 `1536x864` |
| `aspect_ratio` | 否 | `16:9`、`9:16`、`1:1`、`4:3`、`3:4`，未给 `size` 时按它换算 |
| `quality` | 否 | 默认 `medium` |
| `background` | 否 | 透传为背景参数 |

### kling

| 键 | 必填 | 说明 |
| --- | --- | --- |
| `prompt` | 是 | 视频提示词 |
| `mode` | 否 | ClipOS 统一模式；省略时 MCP 使用 `full_reference`。需要参考首帧/尾帧时按模型能力传对应模式 |
| `first_frame_url` | `i2v` 时必填 | 首帧图 URL |
| `last_frame_url` | 否 | 尾帧图 URL |
| `aspect_ratio` | 否 | 默认 `16:9` |
| `resolution` | 否 | 默认 `720p` |
| `duration_seconds` | 否 | 默认 5 |
| `generate_audio` | 否 | 默认 `false` |
| `negative_prompt` | 否 | 负向提示词 |
| `audio` | 否 | 显式填 `false` 时关闭声音 |

### seedance

| 键 | 必填 | 说明 |
| --- | --- | --- |
| `prompt` | 是 | 视频提示词 |
| `first_frame_url` / `last_frame_url` | 否 | 首尾帧参考图 |
| `ref_image_urls` | 否 | 参考图 URL 数组 |
| `ref_audio_urls` | 否 | 参考音频 URL 数组 |
| `aspect_ratio` | 否 | 默认 `16:9` |
| `duration_seconds` | 否 | 默认 5 |
| `audio` | 否 | 显式填 `false` 时关闭声音 |
| `watermark` | 否 | 显式填 `true` 时加水印 |

### minimax

| 键 | 必填 | 说明 |
| --- | --- | --- |
| `prompt` | 否 | 音乐描述 |
| `lyrics` | 否 | 歌词 |
| `instrumental` | 否 | 默认纯音乐；显式填 `false` 时唱词 |
| `format` | 否 | 默认 `mp3`，也支持 `wav`、`pcm` |
| `sample_rate` | 否 | 默认 44100 |
| `bitrate` | 否 | 默认 256000 |
| `watermark` / `lyrics_optimizer` | 否 | 显式填 `true` 时开启 |

## 动作表

| Tool | action | 必填 | 可选 | 说明 |
| --- | --- | --- | --- | --- |
| aixcut_generate | quote | — | `kind`、`prompt`、`name`、`provider`、`model`、`input` | 预估积分并校验生成权限，不创建 Job |
| aixcut_timeline | list | — | — | 列出版本时间轴 |
| aixcut_timeline | create | — | `name`、`source_timeline_id` | 创建空白或复制时间轴 |
| aixcut_timeline | duplicate | `source_timeline_id` | `name` | 复制完整时间轴 |
| aixcut_timeline | rename | `timeline_id`、`name` | — | 修改版本名称 |
| aixcut_timeline | delete | `timeline_id` | — | 删除一个版本 |
| aixcut_timeline | reorder | `timeline_ids` | — | 调整版本顺序 |
| aixcut_generate | submit | `idempotency_key` | `accepted_quoted_credits`、`kind`、`prompt`、`name`、`provider`、`model`、`input` | 提交一个生成 Job，返回 `status: "async"` 和 `job_id` |
| aixcut_generate | get | `job_id` | — | 读取一个生成 Job 的进度和产物 |
| aixcut_generate | execute | `job_id` | — | 继续推进一个未完成的生成 Job |
| aixcut_generate | list | — | `limit` | 列出当前 Project 最近的生成 Job |
| aixcut_generate | cancel | `job_id` | — | 取消运行中的生成 Job |

## Job 状态字段

轮询返回的是 Envelope，顶层字段如下：

| 字段 | 说明 |
| --- | --- |
| `status` | `async` 表示这是一次异步任务 |
| `job_id` | 轮询时原样回传 |
| `terminal` | 为 true 时停止轮询 |
| `phase` | `queued`、`submitting`、`provider_waiting`、`materializing`、`finalizing`、`succeeded`、`failed`、`cancelled`、`submission_unknown` |
| `next_action` | 未结束时为 `execute`，等待 `after_seconds` 后用相同 `job_id` 调用 `aixcut_generate execute` |
| `retryable` | 只在失败时出现：`true` 表示稍后重试同一个请求有机会成功，`false` 表示要先改参数或检查配置 |

任务详情在 `result.data.job`，包含 `id`、`status`、`phase`、`error_code` 和产物信息。

## 完整请求示例

```json aixcut_generate
{
  "action": "submit",
  "idempotency_key": "d4c8a1f2-6e30-4b7d-9a15-3c9f7e0b4d28",
  "kind": "video",
  "prompt": "海边日出，镜头缓慢推进",
  "provider": "kling",
  "input": {
    "mode": "full_reference",
    "duration_seconds": 5,
    "aspect_ratio": "16:9",
    "resolution": "720p",
    "generate_audio": false
  }
}
```

```json aixcut_generate
{
  "action": "get",
  "job_id": "7a2f5c91-4b8e-4d36-9f21-58c0e7a3b904"
}
```
