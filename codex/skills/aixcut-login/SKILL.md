---
name: aixcut-login
description: 仅确认当前 Aixcut MCP 的 OAuth 登录状态，不打开网页。用户明确要求只登录、恢复认证或检查登录状态时使用。不用于打开项目页面，也不用于退出登录。（英文：login、sign in、check auth）
---

# 仅登录 Aixcut

## 操作

调用一次 `aixcut_login`，参数为 `{}`。成功时 Envelope 的 `status` 是 `ok`，业务结果 `result.status`
必须是 `authenticated`。

## 状态处理

- **已经授权**：Tool 直接返回 `result.status=authenticated`。
- **未授权或授权过期**：Codex Host 显示 Aixcut OAuth 页面，并在完成后恢复当前调用。AI 不操作授权页面，也不重复调用 Tool。
- **授权被拒绝、取消、失败或超时**：停止并如实报告登录未完成。

## 限制

- 不处理任何页面打开意图；打开页面使用 `aixcut-projects` 技能。
- 不向 `aixcut_login` 添加 `project_id` 或其他业务参数。
- 其他 Tool 遇到未授权时由 Codex Host 恢复原调用，不先调用 `aixcut_login`。
