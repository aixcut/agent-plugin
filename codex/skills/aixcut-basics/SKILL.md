---
name: aixcut-basics
description: Aixcut MCP 的通用规则，覆盖技能路由、读写顺序、稳定引用、幂等、异步任务、返回结构和宿主边界。执行任何 Aixcut 操作且没有更具体的技能时加载，用来兜底；已经有专门技能覆盖当前任务时不要用它代替那个技能。（英文：aixcut basics、mcp rules）
---

# Aixcut 基础规则

## 技能路由

按意图加载技能：成片 `aixcut-video-assembly`；配音 `aixcut-voice`；字幕 `aixcut-captions`；口播 `aixcut-talking-head`；时间轴/素材 `aixcut-timeline-editing`；文档 `aixcut-documents`；生成 `aixcut-generation`；导出 `aixcut-export`；Project `aixcut-projects`；核对 `aixcut-verification`；报错 `aixcut-known-errors`。

## 读写顺序

先读并只用稳定 ref；写入可省略 `idempotency_key`，服务端会生成并在结果返回。重试复用结果 key，新意图不用旧 key。写后读回，结构变化后重读，不复用旧 ref。

涉及“当前项目”先看 `active_project_id`；为空就停止并要求用户提供 Project 名称或 `project_id`，不要从项目列表中默认选择第一个；Studio 或项目列表不等于绑定 Project。

## 返回结构

业务字段在 `result`；`status` 说明结果：`noop` 不重试；`applied_with_warning` 报告 `warnings`；`status_unknown` 原参数加同一 UUID 重试；`async` 用 `job_id` 轮询到 `terminal`。

## 硬规则

OAuth 由 Codex Host 完成并恢复原调用，不要先登录、重复调用或操作授权页。不用 curl、直写数据库、伪造结果、绕过授权或输出 token。读完技能再开始多步流程；写后读回，不把 `applied` 当结论或把失败说成成功。参数以实时 Schema 为准。本机素材只能页内导出。

角色定位、数据模型和 Project 结构见 [references/model.md](references/model.md)。
