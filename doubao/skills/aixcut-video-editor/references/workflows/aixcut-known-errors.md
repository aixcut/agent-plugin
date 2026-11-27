# 错误恢复

按稳定错误码恢复 Aixcut 授权、页面、revision、Job 和导出失败。

## 通用原则

先保留原 identity，查询 receipt 或状态；不得换幂等键重放未知写入。

| 情况 | 处理 |
| --- | --- |
| `MCP_AUTH_GRANT_INACTIVE`、`CLIPOS_401001` | 清除豆包连接器的旧 OAuth 凭据，重新授权一次；不要用旧 token 重试业务调用 |
| `401/403` | 重新核验 OAuth 与 scope |
| 工具未加载 | 先完成连接器授权；当前任务仍未加载工具时请用户新开任务 |
| `revision` 冲突 | 读取当前 `revision`，重建计划，最多重算两次 |
| `MCP_CANVAS_PRESET_INVALID` | 使用返回的 `supported_presets` 或显式 `width`、`height`，不要猜画布别名 |
| `MCP_MOTION_CLIP_UNSUPPORTED` | 对象运动只用于无 composition 内容的真实视频 Clip；文本或 Composition Clip 改用自身动画模型 |
| 结果 `unknown` | 保留 mutation 标识和幂等键，先查 receipt |
| `NLE_IDEMPOTENCY_CONFLICT` | 同一键用于不同目标：检查时间线后用新 UUID 重做 |
| `TIMELINE_ACTIVATION_DEFERRED` | 时间轴已创建或复制，但页面未切换。恢复目标项目页面后调用 `aixcut_frontend(action="activate_timeline", timeline_id=...)`，确认 `status="ready"` 再继续 |
| `pending` / `running` | 沿用原 Job 或 export 标识查询，不能报告完成 |
| 页面离线 | 检查 `page_status`，请用户在目标项目页重新打开；不拼接普通项目 URL |
| `CAPTURE_PERMISSION_REQUIRED` | 请用户在项目页点击一次后重试同一请求，不重新导入素材 |
| 证据不足 | 交付 `unjudgeable` 和缺口，不用模型自评替代真实帧或试听 |

## 子进程与替代客户端

授权或工具加载失败时，不要用子进程、替代 MCP 客户端或普通页面继续。完成授权后当前任务仍未获得 Aixcut 工具时，请用户新开任务。
