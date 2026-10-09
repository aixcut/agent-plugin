---
name: aixcut-export
description: 把 Aixcut 项目导出成 mp4、mov 或 webm 成片，并查询页面导出进度和结果。用户要求导出、导出文件、渲染、下载成片、问导出好了没或导出失败时使用。不用于剪辑、配音或字幕修改。（英文：export、render、download video）
---

# Aixcut 导出

当前只有一条导出链路：项目页面在浏览器里渲染，成片下载到用户电脑。

本机视频不走完整原片上传；有声音时只上传浏览器提取的音频做转录，画面理解由 `capture_source_frames` / `capture_timeline_frames` 按需抽帧。不要把完整视频副本或“云端切片已就绪”当成本机导入和导出的前置条件，也不要提交服务端渲染任务。

## 导出流程

1. 调用 `aixcut_frontend(action="export_timeline")`。需要导出某个非当前版本时传 `timeline_id`；页面会读取目标版本但不会切换用户当前 tab。页面会立即返回 `export_id` 和实际采用的 `format`、`width`、`height`、`frame_rate`。不会返回文件地址，成片由浏览器下载。
2. 受理不等于完成。等待 `next_action.after_seconds` 后调用 `aixcut_frontend(action="export_timeline_status")`，直到 `state` 是 `succeeded` 或 `failed`。
3. `succeeded` 表示成片已经交给浏览器下载；如实汇报 `file_name`、`byte_size`、`mime_type` 和 `elapsed_ms`，不要承诺服务器下载链接。
4. 用户没看到文件时，先检查浏览器下载列表和拦截提示，不要重复提交。
5. 用户想换格式、分辨率或帧率时，再提交一次 `export_timeline`。同一页面同时只能有一次导出，重复提交时改查 `export_timeline_status`。

页面导出要求目标 Project 页面已打开并完成初始化。页面不在线或绑定了其他项目时，先让用户打开目标页面；拿不准时调用 `aixcut_frontend(action="page_status")`。

本机素材还需要浏览器文件访问授权。导出或抽帧报 `CAPTURE_PERMISSION_REQUIRED` 时，让用户在项目页面点一次任意位置后原样重试；不要重新导入文件。

## 失败怎么读

| 错误码 | 含义 | 处理 |
| --- | --- | --- |
| `MCP_EXPORT_ALREADY_RUNNING` | 页面已经有一次导出在运行 | 不要重发，查询 `export_timeline_status` |
| `MCP_EXPORT_INVALID_INPUT` | 输出格式、宽高或帧率不合法 | 按提示修正后再提交 |
| `MCP_EXPORT_FAILED` | 页面渲染失败 | 按 `error_message` 说明；必要时换参数再试一次 |
| `MCP_EXPORT_CANCELLED` | 用户取消了导出 | 如实说明，不要当成系统故障 |
| `MCP_FRONTEND_NOT_BOUND` | 当前授权没有绑定浏览器页面 | 让用户打开 Aixcut Project 页面 |
| `MCP_FRONTEND_CLIENT_OFFLINE` | 当前 MCP grant 没有活跃的页面连接 | 停止自动重开项目；让用户在同一 MCP 会话中打开目标 Project，之后只查 `page_status`，在线后最多重试导出一次 |
| `MCP_FRONTEND_PAGE_NOT_ACTIVE` | 页面在线但打开的是其他项目 | 让用户切换到目标 Project |

## 边界

- 导出不改变时间轴内容，不要顺手修改项目。
- 成片不经过 MCP，不要承诺稍后提供文件链接。
- 本机素材导入和异步收尾见 `aixcut-timeline-editing`；完整成片编排见 `aixcut-video-assembly`。

## 完成判定

只有 `export_timeline_status` 返回 `state: "succeeded"` 才算完成，并且要说明文件名、格式、分辨率、时长和体积。
