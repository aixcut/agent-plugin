---
name: aixcut-voice
description: 写配音文稿、选音色、合成配音并可选铺到时间轴。用户提到配音、旁白、解说、口播文案、换音色或配音没声音时使用。不用于生成背景音乐和音效，也不用于画面编排。（英文：voiceover、dubbing、TTS、narration）
---

# Aixcut 配音

配音文稿和音色保存在 Project 的 Voice 文档里；生成音频会绑定回对应配音段。铺轨是单独的可选步骤。

## 操作流程

1. 调用 `aixcut_read(view="voice")`，读取配音段、音色清单和默认值。
2. 按用户要求用 `aixcut_voice(set/add/update/settings)` 修改文稿、音色或参数。
3. 调用 `aixcut_voice(action="render", targets=[...])`。一次调用会生成或复用音频、登记素材、绑定配音段并等待转录完成。
4. 用户要求放到时间轴时，传 `place=true`，可设置 `start_ms`、`gap_ms` 和 `track`。铺轨会清空选中的配音音轨并按当前结果重建，这是配音轴的重排操作；只对专用配音音轨执行。不要求铺轨时省略 `place`。
5. 根据返回的逐段结果和 `placement` 结果汇报。音频生成成功不代表铺轨也成功。

配音渲染需要用户已登录且打开目标 Project 页面。页面关闭、未就绪或没有写权限时，调用会返回明确错误。调用超时表示结果未知：用相同的 `idempotency_key` 和相同参数重试，不要另起新请求；用户明确要求重新生成时再使用新 key。

## 音色和文稿

- 音色 ID 必须来自 `aixcut_read(view="voice")` 返回的 `profiles`。
- 用户点名音色时按用户选择；未指定时使用文档默认值。
- 多段文稿按自然停顿拆分；每段独立生成，铺轨时按顺序放置。
- 语速与情绪只接受动作表列出的值。

## 边界

- `render` 不会默认修改时间轴；只有 `place=true` 才铺轨。
- 逐段失败会显示失败项。部分失败时不会铺轨；修复文稿或音色后用新 key 重试。
- 后端任务提交后，即使浏览器连接中断，生成也可能继续；连接中断不会撤销已生成音频。
- 不要手工写 `audio_status`、`audio_media_id` 或 `audio_synthesis_hash`；绑定由配音任务完成。
- 参数细节见 [references/actions.md](references/actions.md)。

## 完成判定

检查逐段状态和 `placement`。只生成时确认配音段已有音频；要求铺轨时还要确认返回 `placement.status="applied"`。
