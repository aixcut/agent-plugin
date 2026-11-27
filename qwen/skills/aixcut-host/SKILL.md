---
name: aixcut-host
version: 1.0.0
description: QwenWorkCN host adapter for Aixcut MCP OAuth, browser handoff, user-selected media upload, workflow storage, and export delivery. Load before the first Aixcut MCP call.
name_en: Aixcut QwenWorkCN Host
name_zh: Aixcut 千问宿主适配
description_en: QwenWorkCN host adapter for Aixcut MCP OAuth, browser handoff, user-selected media upload, workflow storage, and export delivery.
description_zh: Aixcut 的千问办公版宿主适配：MCP 连接器授权、浏览器交接、用户选择素材上传、工作流存储与导出交付。
---

# Aixcut QwenWorkCN Host

This Skill owns the boundary between QwenWorkCN and the Aixcut MCP server (`https://web.aixcut.cn/mcp`). Load it before the first Aixcut call in a conversation.

## Connection and authorization

- Aixcut connects via QwenWorkCN's custom MCP connector (`qwenwork.settings.connector.custom.aixcut`) pointing to `https://web.aixcut.cn/mcp`.
- QwenWorkCN owns OAuth, credential storage, refresh, and revocation. Never ask for, print, store, or pass an access token.
- If Aixcut tools are not loaded yet, check `qwenwork.settings.connector.custom.aixcut` and guide the user to enable and authorize it, then start a new conversation.
- For `MCP_AUTH_GRANT_INACTIVE`, ask the user to re-authorize the `aixcut` connector once instead of retrying the failed business call.
- For logout, call `aixcut_logout` once when available, and clear the connector authorization in QwenWorkCN settings if needed.

## Browser handoff

- `aixcut_open` returns a complete, single-use `result.browser_handoff.url`. Open or hand off that exact URL so the user can enter Aixcut Studio without an extra login step.
- Never print, quote, persist, or reuse the one-time handoff URL token. Display only `result.editor_url` when a clean link is needed.
- Wait for the returned interval, then call `aixcut_frontend(action="page_status")` before frame capture, page export, or user-assisted upload. Continue only when `presence_connections >= 1` and the target Project appears in `pages`.

## Local media and files

- Never start a local HTTP server or loopback file bridge for local media.
- Use `aixcut_frontend(action="prompt_add_material")` so the user selects or drags files in the Project page, then confirm via `aixcut_read(view="sources")` matching `file_name`.
- A hosted MCP server cannot read a path on the user's computer directly; Project documents must be added through the Project Documents panel or explicit upload workflow.

## Export delivery

- Export requires explicit user authorization. Never trigger `aixcut_frontend(action="export_timeline")` or `aixcut_export` without explicit user approval.
- Prefer browser rendering when the target Project page is online and supports `export_timeline`; use headless rendering only when all sources are cloud-readable.
- Never claim an edit, caption sync, render, or export succeeded until confirmed by read-back evidence.
