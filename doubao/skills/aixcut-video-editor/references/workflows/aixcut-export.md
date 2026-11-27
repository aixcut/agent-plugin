# 导出工作流

导出必须由用户明确授权。剪辑完成本身不等于导出授权：先提示用户可以手动导出，或回复明确指令让 Agent 导出；授权前不得调用任何导出能力。

## 选择渲染路径

授权后按固定降级顺序处理，不询问用户选择：

1. 先尝试启动或连接有头浏览器，并调用 `aixcut_frontend(action="page_status")`。
2. 目标项目页在线且 `capabilities` 包含 `export_timeline`：使用浏览器渲染。
3. 有头浏览器无法启动、页面不可用或没有 `export_timeline`：使用无头渲染。
4. 无头渲染要求时间线引用的全部素材都可云端读取。缺少云端原件时，调用 `aixcut_upload_link(action="create")`，展示链接或二维码，跟踪同一 `upload_id`，文件入库后再继续原导出。
5. 两条路径都不可用时报告阻塞，不提交已知会失败的 Job。

本地视频默认不上传原片。浏览器渲染可以读取浏览器本地素材；无头渲染读取不到仅存在于浏览器里的素材。

## 浏览器渲染

1. 只在线页面明确提供 `export_timeline` 时调用 `aixcut_frontend(action="export_timeline")`。
2. `timeline_id`、`expected_revision`、格式和尺寸字段必须放在顶层，绝不放进 `params`。
3. 结果为 `prompt_opened=true` 表示页面已打开用户导出对话框；Agent 的职责结束，由用户完成本地导出和下载。
4. 不要调用 `export_timeline_status`、等待文件、检查下载目录，或在用户确认完成前声称文件存在。
5. 用户后续确认导出完成并请求继续时，再从该用户消息继续处理。

## 无头渲染

1. 调用 `aixcut_export(action="submit")`。单帧使用 `kind="frame"`；媒体使用 `kind="export"`、`range`、`output` 与 `mp4/mov/webm/mp3/aac/wav`。
2. 保留 `job_id`，用 `aixcut_export(action="get", job_id=...)` 轮询到终态；取消使用 `cancel`。
3. 成功结果中的 `download_url` 是短期地址，不是永久链接；不要为了刷新链接重复提交 Job。
4. 成功结果的 `render_mode="headless"`，报告格式、大小、内容类型和过期时间。

## 导出后分析

导出和导出后分析是两个独立请求。默认导出不验证成片内容。

用户后续要求分析或核验时：

- 无头结果：使用 `download_url` 下载文件后分析；
- 浏览器渲染且宿主返回真实本地路径：直接分析该路径；
- 浏览器渲染但没有可验证路径：让用户上传成片，或明确授权一次新的“浏览器渲染到 library/artifact”流程；不得静默重新导出。

## 规则

- 导出只用于交付用户要的成片。不要为了汇报进度、收尾中间步骤或验证半成品而导出。
- 同一页面同一时间只跑一个导出；正在导出时只查询状态，不再提交。
- 导出不改变时间线内容，不做未请求的编辑。
- 目标页离线时按 `error.next_action` 做一次有界交接；一次交接后仍离线就停止询问用户。

## 错误处理

| 错误 | 含义与动作 |
| --- | --- |
| `MCP_EXPORT_ALREADY_RUNNING` | 不要重复提交，调用 `export_timeline_status` |
| `MCP_EXPORT_INVALID_INPUT` | 修正格式、尺寸或帧率后重新提交 |
| `MCP_EXPORT_FAILED` | 说明 `error_message`；有明确参数理由时最多重试一次 |
| `MCP_EXPORT_CANCELLED` | 报告用户取消，不当作系统故障重试 |
| `MCP_FRONTEND_NOT_BOUND` / `MCP_FRONTEND_CLIENT_OFFLINE` / `MCP_FRONTEND_PAGE_NOT_ACTIVE` | 按 `error.next_action` 做一次有界页面交接；仍不可用就停止 |
| `CAPTURE_PERMISSION_REQUIRED` | 请用户在项目页点击一次后重试原浏览器请求，不要重新导入素材 |
