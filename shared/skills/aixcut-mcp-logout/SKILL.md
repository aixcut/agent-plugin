---
name: aixcut-mcp-logout
description: 退出 Aixcut MCP 登录，撤销当前服务端 OAuth 授权并清除 Codex 保存的 Aixcut MCP OAuth 凭证。用户要求退出、注销、切换账号或清除 Aixcut MCP 授权时使用；不用于退出 Studio 网页登录。（英文：logout、sign out、revoke access）
---

# 退出 Aixcut MCP

## 操作

1. 如果当前会话已经授权且可调用 `aixcut_logout`，调用一次，参数为 `{}`，撤销服务端授权。
2. 无论 Tool 是成功、不可用还是已经未授权，都执行 `codex mcp logout aixcut`，清除 Codex 保存的 OAuth 凭证。
3. 根据两步结果报告状态：
   - 两步成功：Aixcut MCP 已完全退出；
   - Tool 已未授权且本地清理成功：Aixcut MCP 已退出；
   - 只有一步成功：明确说明哪一侧仍未清理，不能声称完全退出。

## 限制

- 不执行 `codex mcp remove aixcut`；退出登录必须保留 MCP server 配置。
- 如果 Tool 不可用，或调用会显示新的登录/授权页面，跳过或取消授权并直接执行本地 logout，不能为了退出而登录。
- 不重复调用 `aixcut_logout`，也不自动重新登录验证。
- 不退出 Studio Web session；除非用户另行明确要求退出 Studio 网页登录。
- 不输出、读取或复制 OAuth access token、refresh token 或本地凭证文件内容。
