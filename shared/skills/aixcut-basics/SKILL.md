---
name: aixcut-basics
description: "Shared Aixcut MCP rules for context, read-before-write, stable refs, idempotency, async jobs, envelopes, and host boundaries. Load as fallback when no specialist Skill applies; do not use instead of a specialist workflow. Chinese triggers: 项目、时间轴、字幕、配音、生成、导出、报错."
---

# Aixcut MCP Basics

Load with the relevant specialist Skill. Follow [language](references/language.md), [conversation guidance](references/conversation-guidance.md), and [ownership](references/model.md).

Inspect `active_project_id`. If empty, ask for a Project name or `project_id`; never choose the first listed Project.

Read before writes; use returned refs. Reuse read evidence while Project, timeline, and revision are unchanged. Reread after writes, warnings, conflicts, or external changes; refresh before position-dependent commands.

Keep independent read calls parallel. Structural writes on the same timeline stay serial. Group the same action on the same track into one call using `items[]` or `targets`. Only the live Tool Schema decides what may be combined. Read affected views after each atomic batch.

Reuse `idempotency_key` only for identical retries. For `status_unknown`, retry original parameters and UUID. For `async`, follow `job_id` and `next_action` until terminal. Business fields are in `result`; `noop` is final, `applied_with_warning` requires reporting warnings.

The Host handles OAuth; do not call `aixcut_login` first. Never use curl, direct database writes, invented server paths or results, bypass permissions, or expose tokens. Verify responses before reporting success.
