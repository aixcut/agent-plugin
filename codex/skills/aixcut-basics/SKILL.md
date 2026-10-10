---
name: aixcut-basics
description: "Shared Aixcut MCP rules for context, read-before-write, stable refs, idempotency, async jobs, envelopes, and host boundaries. Load as fallback when no specialist Skill applies; do not use instead of a specialist workflow. Chinese triggers: 项目、时间轴、字幕、配音、生成、导出、报错."
---

# Aixcut MCP Basics

Load with the relevant specialist Skill.

## Language

Keep Tool names, schema fields, enums, errors, refs, and API terms unchanged. Converse in the user's current language. Create captions, scripts, titles, overlays, and generation prompts in the requested content language. Conversation and content language are independent; follow [the language policy](references/language.md).

## Conversation guidance

For each turn, make the current stage and next step clear when useful. If the goal is clear and the next action is safe, inspect and continue. Pause only for a consequential missing choice, permission, cost or credits, or destructive changes. Distinguish accepted, running, complete, failed, and unknown; state the user's exact action when work is blocked on them. Follow [the conversation guidance](references/conversation-guidance.md).

## Read and write

Read the current Project and use returned refs. Reuse an `idempotency_key` only for an identical retry; use a new key for each new write. Read affected views after writes and refresh refs after structural changes.

Inspect `active_project_id`. If empty, ask for the Project name or `project_id`; never choose the first listed Project. Studio and the Project list do not bind one.

## Results and boundaries

Business fields are in `result`. `noop` is final; report `warnings` for `applied_with_warning`. For `status_unknown`, retry only the original request and UUID. For `async`, follow `job_id` and `next_action` until terminal.

The Host handles OAuth. Do not call `aixcut_login` first, repeat authorization, use curl, edit the database, invent results, bypass permissions, or expose tokens. Verify successful responses. Use supported local-media flows; never invent server paths.

Read the role and Project model in [references/model.md](references/model.md).
