# 项目工作流

打开、选择、新建和退出 AIXCut 项目。

## 项目归属选择

新的独立视频或成片，不代表可以复用当前 MCP 项目。`active_project_id` 已有值时，如果用户没有明确选择当前项目，也没有提供 `project_id`，先询问“新建项目还是继续当前项目”，并优先建议新建项目。不得因为项目页面仍然打开就静默编辑旧项目。

用户选择新建时，要求标题并调用 `aixcut_open(target="new_project")`，在调用返回前不得执行 canvas 或其他项目级写入。返回后，在 `active_project_id` 等于新 Project 前，后续所有项目和 Timeline 写入都必须显式携带返回的 `project_id`；canvas 还必须显式携带返回的 `timeline_id`，不能回退到上一个 active Project。用户选择继续当前项目时，明确说明将写入哪个项目，并确认现有绑定；不要无故重复打开已经连接的项目页面。

没有 active Project 时先 `aixcut_open`。OAuth 后若当前任务仍未加载 Aixcut 工具，停止并让用户新开任务；禁止用子进程、替代 MCP 客户端或普通 URL 创建或打开项目。成功后只打开完整 `browser_handoff.url`，再用页面状态确认连接。
