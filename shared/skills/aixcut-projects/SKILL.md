---
name: aixcut-projects
description: 列出、新建、打开或切换 Aixcut Project，也可退出当前 Project，并让编辑器绑定到目标项目。用户要求打开 Aixcut 页面、进入某个项目、新建项目、切换项目或离开当前项目时使用。不用于编辑时间轴内容。（英文：open project、new project、switch project）
---

# Aixcut Project

## 打开页面

根据用户意图调用一次 `aixcut_open`：

**要在编辑器页面里干活时（抽帧、截帧、提示用户上传素材），必须用 `project` 打开具体项目页。** 只打开 Studio 或项目列表不会绑定编辑器能力，后续浏览器动作会因为找不到页面而失败。

| 意图           | 参数                                                              |
| -------------- | ----------------------------------------------------------------- |
| 打开 Studio    | `{"target":"studio"}`                                             |
| 打开项目列表   | `{"target":"project_list"}`                                       |
| 新建并进入项目 | `{"target":"new_project","title":"...","description":"可选描述"}` |
| 打开指定项目   | `{"target":"project","project_id":"..."}`                         |

成功后把 `result.open_in_codex` 原样交给 Codex Desktop 的正式打开能力。

## 新建项目之后：先确认页面真的开了

`new_project` 会在服务端直接把项目骨架建好（默认 sequence、video/text/audio 三条轨道、空的配音文档），所以创建完就能直接读写，不需要等页面。返回里：

- `result.data.project_id`、`result.data.sequence_id`：新项目和新默认 sequence。
- `result.data.page_open_requested: true`：只是"请求了打开页面"，**不代表页面已经打开**；`open_in_codex` 返回 `queued` 也不代表页面已经连接。
- `result.next_action`：通常是 `wait_then_read`，等 5 秒后调 `aixcut_frontend action=page_status` 确认。

要不要确认取决于接下来做什么：只做时间轴读写和配音合成，不需要页面；一旦要做抽帧、截帧、页内导出、提示用户上传素材，就必须先 `page_status` 看到 `presence_connections >= 1`，否则这些动作会直接报离线。若 `presence_connections=0`，停止并等待用户在同一 MCP 会话中打开或切换页面；不得再次调用 `aixcut_open`，也不得把 `queued` 当成已连接。页面上线后只重试原动作一次。

## 返回数据

- `studio`、`project_list`：`result.data.projects` 和 `result.data.total` 是当前 Workspace 的项目目录，可直接回答用户。
- `project`：`result.data.project` 与 `aixcut_read(view=project)` 的项目摘要相同，不要重复读取同一摘要。
- `new_project`：同步创建 Project 并初始化骨架，`result.data.project_id`、`result.data.sequence_id` 和 `result.data.project` 是创建结果。
- `result.active_project_id` 是当前 MCP Project。`project` 和 `new_project` 会把它设为目标 Project，随后可直接使用 Project 工具；`studio` 和 `project_list` 只导航，不改变该值。
- 没有 `active_project_id` 时，不要默认选择第一个 Project；要求用户提供 Project 名称或 `project_id`，再调用 `target=project` 打开并绑定。
- 页面仍会自行加载业务数据；上述数据只供当前调用使用。

## 切换与退出

- 用户明确要求退出当前 Project 时，调用无参数 `aixcut_exit_project`，不要用打开 Studio 或项目列表代替。
- 只有显式退出才清空当前 Project；普通 Project 工具省略 `project_id` 时会继续使用当前值。

## 认证与限制

- 缺少授权时由 Codex Host 完成 OAuth 并恢复当前调用。不要先调用 `aixcut_login`，不要重复调用 `aixcut_open`，不要操作授权页面。
- 授权被拒绝、取消、失败或超时时，停止并如实告诉用户页面未打开。
- 只使用固定 target，不传入任意 URL、`return_to` 或未声明字段；不猜 `project_id`。
- `title` 是新建项目的必填名称；新建时不需要传 `idempotency_key`，每次调用都创建新 Project。
- 不输出、记录或复制返回 URL 里的完整 `session_token`。
