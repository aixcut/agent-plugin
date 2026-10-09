---
name: aixcut-known-errors
description: 按稳定错误码恢复 Aixcut 调用失败，区分参数错误、授权、上下文、冲突、浏览器不可用和服务端故障。Aixcut 工具返回失败或用户问为什么报错时使用。不要用它处理业务需求，调用成功时也不要加载。（英文：aixcut error、troubleshooting）
---

# Aixcut 错误恢复

失败返回 `status: "rejected"`，恢复方式看 `error.code`、`error.type`、`error.retryable` 和 `error.next_action`，不要根据 `error.message` 文本分支。

## next_action 的含义

| kind | 含义 |
| --- | --- |
| `none` | 不能自动恢复，需要用户决定 |
| `resolve_input` | 参数或 ref 必须先修正再重试 |
| `retry` | 可以按 `after_seconds` 重试同一请求 |
| `poll` | 继续轮询同一个 `job_id` |
| `open_editor` | 需要先打开对应页面 |
| `run_helper` | 需要先执行本机 helper |
| `wait_then_read` | 动作已受理、结果还在后台产生：等 `after_seconds` 后调用 `read` 指定的读接口确认，不要当成已完成，也不要重发原请求 |

## 常见错误码

### 参数与契约

- `MCP_ARGUMENTS_INVALID`、`MCP_ARGUMENT_UNKNOWN`：字段缺失、类型错误或多传了字段。只发送所选工具 Schema 声明的字段。
- `MCP_ACTION_INVALID`、`MCP_VIEW_INVALID`、`MCP_OPEN_TARGET_INVALID`：动作或 view 不合法，改用该工具支持的值。
- `MCP_IDEMPOTENCY_KEY_INVALID`：`idempotency_key` 不是 UUID v4，生成新的。
- `MCP_ACTION_UNSUPPORTED`：该工具不支持这个动作。
- `MCP_LAYOUT_CLIP_UNSUPPORTED`：目标片段没有画面。位置只对带画面的视频和图片片段成立，音频和文字片段没有位置字段。

### 授权与上下文

- `MCP_SCOPE_REQUIRED`：当前授权缺少所需 scope。由 Codex Host 重新授权，不要改用其他工具绕过。
- `MCP_PROJECT_CONTEXT_REQUIRED`：没有当前 Project。让用户选择，或用 `aixcut_open` 进入一个 Project。
- `MCP_PROJECT_NOT_FOUND`、`MCP_PROJECT_NOT_INITIALIZED`：项目不存在或还没初始化，先确认目标 Project。

### 并发与冲突

- `MCP_MUTATION_SERVER_REJECTED`：服务端拒绝了这次写。重新读取最新快照后重新生成操作，不要原样重放。
- `NLE_IDEMPOTENCY_CONFLICT`：同一个 `idempotency_key` 之前绑过另一份内容。换一个新 UUID 重新生成操作，不要用同一个 key 换内容重试。
- `MCP_TRACK_ENSURE_NOT_APPLIED`：`aixcut_track ensure` 回了成功，但回查时时间轴上没有这条轨道（旧 UUID 命中旧回执、而轨道已被删）。换新 UUID 重新 `ensure` 一次。
- `MCP_CANVAS_DEFAULTED`：不是失败。画布原本是 `0×0`，已按默认 `1920×1080` 落定；需要竖屏或其它比例时用 `aixcut_project action=canvas` 覆盖。
- `MCP_MUTATION_LOCAL_REJECTED`：本地校验没过，通常是 ref 过期或范围越界。
- `MCP_PROJECTION_BARRIER_TIMEOUT`、`MCP_ZERO_QUERY_UNAVAILABLE`：读取没有在超时内完成，可以原参数重试。

### 状态未知

- `MCP_MUTATION_STATUS_UNKNOWN`：写入是否生效未知。必须原参数、原 `idempotency_key` 重试，禁止换新 UUID。

### 浏览器

- `MCP_FRONTEND_NOT_BOUND`：当前授权还没绑定到任何浏览器客户端，页面根本没连上来过。让用户先在本机浏览器打开一次 Aixcut 并进入这个 Project，再重试。
- `MCP_FRONTEND_CLIENT_OFFLINE`：这不是 OAuth 未授权，而是当前 MCP grant 没有活跃的浏览器前端连接。先调用 `aixcut_frontend action=page_status`；只有 `presence_connections >= 1` 且 `online_project_pages >= 1` 才能继续。若 `presence_connections=0`，立即停止：不得再次调用 `aixcut_open`，不得重发导入或原页面动作；让用户在同一 MCP 会话中打开或切换到目标 Project，下一轮只重新检查 `page_status`。`open_in_codex` 返回 `queued` 只表示打开请求排队，不代表页面已连接。页面上线后才允许把原动作重试一次，再次离线就停止并报告。
- `MCP_FRONTEND_PAGE_NOT_ACTIVE`：客户端在线，但在线的页面不是这个 Project（或不是这个 workspace）。details 里的 `online_pages` 列出当前真正开着的页面，`requested_project_id` 是你要的那个。按 `online_pages` 告诉用户切到哪个 Project，不要笼统说“页面没开”。
- `MCP_FRONTEND_CAPABILITY_UNAVAILABLE`：页面在、Project 也对，但这个动作页面还没上报（通常是项目运行时还在加载或等授权）。等 15–30 秒重试一次；仍然不可用就如实说明。
- `MCP_FRONTEND_MEDIA_TYPE_INVALID`：请求的 Project 素材不是音频；`analyze_music_beats` 只能分析 `aixcut_read view=sources` 中 `media_type=audio` 的素材。
- 拿不准现在是哪一种时，先调只读探针 `aixcut_frontend action=page_status`：它返回 `bound_frontend_client_id`、`binding_error`、`presence_connections`、`online_project_pages`、`online_studio_pages`、`pages`，不会抛离线错。按探针结果再决定是让用户打开页面、切 Project，还是等待。
- 以上四种都不要连续重发同一条请求；浏览器离线时不得自动循环打开项目。也不要用其他工具假装完成了一个需要页面的动作。
- `MCP_FRONTEND_TIMELINE_STALE`：时间轴已变化，重新读取再重截。
- `MCP_FRONTEND_EXPORT_INVALID`：页内导出的输出参数不合规（格式、宽高或帧率越界），在 MCP 侧就被拦下。按参数说明改正后重发，不要原样重试。
- `MCP_EXPORT_INVALID_INPUT`：页面判定页内导出的输出参数不合规，含义同上一行。改正参数后重发一次，不要原样重试。
- `MCP_EXPORT_ALREADY_RUNNING`：这个项目页已经有一次导出在跑。不要重发导出，改用 `aixcut_frontend action=export_timeline_status` 查那一次的结果。
- `MCP_EXPORT_FAILED`：页内渲染失败。按状态结果里的 `error_message` 说明，不要原样重放；换参数再试一次仍失败就停下报告。
- `MCP_EXPORT_CANCELLED`：用户在页面上取消了这次导出。如实说明是取消，不要当成失败重试。
- `CAPTURE_PERMISSION_REQUIRED`：素材是本机导入的，浏览器的文件访问授权已失效（页面刷新或换了浏览器）。**先让用户在项目页面上点一次任意位置**（页面会在这次点击里自动补授权，也可以点页面里的「立即修复」），再原样重试。不要重新导入素材，也不要改用其他工具绕过。
- `MCP_LOCAL_MEDIA_BRIDGE_UNREACHABLE`：本机素材桥的 url 已经取不到文件了（桥没起、过期、或换了端口）。同一个 url 重试没有用：**要么按 `aixcut-timeline-editing` 重跑桥命令拿新打印的 url 再试，要么回到 `prompt_add_material` 让用户手动上传**。不要反复重试同一个 url，也不要自己拼地址。

页面导出的失败不走 `rejected`，而是出现在 `export_timeline_status` 的 `error_code` 里，处理见 `aixcut-export`。

### 服务端与限流

- `MCP_RATE_LIMITED`：按 `retry_after_seconds` 退避后重试同一请求。
- `MCP_CLIPOS_UNAVAILABLE`、`MCP_CLIPOS_REQUEST_FAILED`、`MCP_INTERNAL_ERROR`：服务端故障，可重试；连续失败时停止并报告，不要反复重试。

### 生成

- `MCP_PROVIDER_TIMEOUT`、`MCP_PROVIDER_TASK_FAILED`：生成失败，报告 Job 的 `error_code`，不要重新提交。

### 配音渲染

- `MCP_VOICE_TARGETS_REQUIRED`：`render` 没给 `targets`。补齐要渲染的配音段 ref 再试。
- `MCP_VOICE_NOT_INITIALIZED`：这个 Project 还没有配音文档，先写入配音段再渲染。
- 页面未就绪、音色或片段输入不合法时，修复对应 Project 内容后重试；超时使用原 `idempotency_key` 重试，不要误报成任务取消。

### 素材分析

- `MCP_CAPTION_VOICE_AUDIO_NOT_ON_TIMELINE`：配音素材已经绑定到 Voice 段，但没有启用的旁白音频片段在时间轴上。先用 `aixcut_audio` 将该素材落轨，再重新读取 `timeline` 并执行字幕 `regenerate`；不要把这个状态误判成转录为空。
- `MCP_CAPTION_TRANSCRIPT_PENDING`：配音音频已生成/落轨，但对应转录任务仍在处理中。不要再次生成配音或伪造字幕；稍后回读音频源状态，成为 `available` 后再执行字幕 `regenerate`。
- `MCP_SOURCE_TRANSCRIPT_MISSING`、`MCP_SOURCE_TRANSCRIPT_OUTDATED` 或 `MCP_SOURCE_TRANSCRIPT_EMPTY`：素材已经在项目里，但逐字稿尚未生成、需要重新生成或内容为空。按详情里的 `transcript_status` 处理；这不是重新导入素材的理由。
- `MCP_SOURCE_WORD_TIME_LIMIT_INVALID`：`source_lines` 请求词级时间时一页超过 50 行。减少 `limit`，或用 `selectors` 收窄到真正需要词时间的行。
- `MCP_SOURCE_LINES_RESPONSE_TOO_LARGE`：单页即使只保留一条逐字稿记录也超过安全响应体积。不要重复原请求；先用文本和时间完成能做的步骤，并报告这条逐字稿记录异常。

## 报告要求

失败时如实说明：调用了哪个工具、返回的错误码、以及下一步需要用户做什么。不要把失败包装成成功，也不要在没有确认的情况下声称已经改好。
