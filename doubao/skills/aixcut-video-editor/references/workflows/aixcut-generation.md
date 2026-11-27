# 生成工作流

管理图片、视频、音乐、音频创作和语音生成任务及其报价、轮询和恢复。

`kind` 支持 `image`、`video`、`music`、`audio`、`speech`（语音走 speech_* 动作）。其中 `audio` 是
Seed Audio 音频创作，用来生成环境音、音效或短语音，不是音乐：可用 `duration_seconds`、`format`、
`sample_rate`、`speech_rate`、`loudness_rate`、`pitch_rate`、`enable_subtitle`、`references`、
`import_requested`、`transcribe`，最多 3 段参考音频加 1 张参考图。

付费生成先报价并确认，但**只在用户没指定模型时才问，并且只问一次**：用户已经点名模型（或已经否掉某个）就直接按那个模型报价并提交，不要再确认；没点名时把可选模型和各自报价一次列清让用户挑，不要分多轮追问，也不要替用户选。沿用原 Job ID 查询或取消，不换 key 盲目重放。

## 图片模型字段边界

调用 `aixcut_generate` 时，`prompt` 是 MCP 请求的顶层字段；`input` 只放图片模型选项。不要把 `prompt` 放进 MCP 的 `input`，也不要把模型选项混进 `prompt`。例如：

```json
{
  "action": "quote",
  "kind": "image",
  "model": "gpt-image-2",
  "prompt": "海边日出，电影感光线",
  "input": { "aspect_ratio": "16:9", "image_size": "2K", "quality": "high" }
}
```

### GPT Image 2

`gpt-image-2`（provider `image2`）使用服务端 `Image2Options`。可用字段包括 `mode`（`generate` / `edit`）、`reference_images`（编辑时 1–10 张）、`size`、`ratio` 或 `aspect_ratio`、`image_size`（`1K` / `2K` / `4K`）、`quality`（`auto` / `low` / `medium` / `high`）、`purpose`、`style`、`background`。`ratio` 是 `aspect_ratio` 的别名；可选比例为 `16:9`、`9:16`、`1:1`、`4:5`、`3:4`、`4:3`。显式 `size` 使用 `auto` 或两个正整数构成的 `宽x高`，不能与比例或 `image_size` 同时设置。未指定质量时，`purpose: "cover"` 默认为 `high`，其他情况默认为 `medium`。

## 告警必须转告用户

任务到终态也不等于和用户的要求一致：回执里的 `warnings` 说明模型没能满足什么。
`generation_duration_ignored` 表示实际时长和要求的时长不一致，`generation_frame_resized`
表示实际画幅不是要求的像素，`generation_layer_decomposition_incomplete` 表示要求拆层却
只出了一张图。每条告警都要原文转告并带上实际数值，不能把结果说成
"按要求完成"；请求被接受了，变的是结果。
