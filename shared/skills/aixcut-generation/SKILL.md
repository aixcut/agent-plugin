---
name: aixcut-generation
description: 生成 Aixcut 里的图片、视频和音乐，并跟踪异步任务进度。用户要求生成画面、生成配图、生成音乐、AI 生视频或查看生成进度时使用。不用于编辑已有素材，也不用于成片整体编排。（英文：generate image、generate video、generate music）
---

# Aixcut 生成与素材

生成是持久化 Job，不是同步操作。

## 最短路径

1. 确认目标 Project，需要时先读 `aixcut_read(view="project")`。
2. 需要展示费用或确认权限时，先调用 `aixcut_generate(action="quote")`，它只报价，不创建 Job。
3. `aixcut_generate(action="submit")` 提交生成。
4. 返回 `status: "async"` 时用顶层 `job_id` 调用 `aixcut_generate(action="execute")` 继续执行；`get` 只读取状态。
5. 按顶层 `next_action.after_seconds` 决定下一次轮询时间，服务端已经按阶段给好间隔；顶层 `terminal` 为 true 后停止轮询。
6. 汇报进度用顶层 `phase`（`waiting` 排队、`processing` 生成中、`finalizing` 入库中），不要只说「处理中」。
7. 完成后把生成结果插入时间轴。

用户要求多个视频版本时，先由编排技能调用 `aixcut_timeline(action="list")` 并复制目标时间轴；`aixcut_generate` 仍是 Project 级素材生成，一份生成结果可以被多个 `timeline_id` 复用。素材生成完成后，分别在各目标时间轴上落位和验证。

## 生成类型

- `kind` 取 `image`、`video` 或 `music`，其中音乐在服务端按音频处理。
- 未指定 provider 时使用服务端默认值；只在用户明确要求时覆盖。
- 提示词、风格和时长按用户原话填写，不要擅自改写创意方向。

## 素材来源

生成工具只产出新素材，不用它导入现成文件。导入本机素材或文档见 `aixcut-timeline-editing` 的「本机素材」和 `aixcut-documents`。

- 生成出来的素材会进入项目素材库；最终成片统一由打开的项目页面导出。
- 不要伪造 URL，也不要把本机路径当链接发送。

## 边界

- 提交成功不等于完成，禁止在 Job 还是 `queued`、`running` 或 `publishing` 时报告生成完成。
- 失败时报告 `result.data.job.error_code`。
- 顶层 `retryable` 只在 Job 失败时出现：`true` 表示稍后重试同一个请求有机会成功，`false` 表示要先改参数、换素材或检查配置。没有这个字段时不要自动重试。
- 取消用 `action="cancel"`，列表用 `action="list"`。
- 生成结果的下载地址是短期签名地址，不要写入项目文档或长期保存。

## 完成判定

Job 进入终态、产物已经插入时间轴、且读回 `timeline` 能看到对应片段。完成后报告 `job_id`、最终状态和落位后的 ref。
