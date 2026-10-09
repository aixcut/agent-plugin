# 导出动作表

本文件只回答页面导出的参数。项目导出统一使用 `aixcut_frontend`，不要提交服务端渲染任务。

## 通用字段

- `project_id`：可选；省略时使用当前 Project。
- `workspace_id`：可选；用于指定编辑器工作区，一般省略。
- `timeout_ms`：可选；页面动作的等待上限，一般省略。
- 所有 Tool 都是严格对象，多余字段会被拒绝。

## 动作表

| Tool | action | 必填（`action` 之外） | 可选 | 说明 |
| --- | --- | --- | --- | --- |
| aixcut_frontend | export_timeline | — | `timeline_id`、`expected_revision`、`format`、`width`、`height`、`frame_rate`、`timeout_ms`、`workspace_id` | 在打开的 Project 页面里渲染并下载成片；指定 `timeline_id` 时不切换页面当前 tab，受理即回 |
| aixcut_frontend | export_timeline_status | — | `timeout_ms`、`workspace_id` | 查询页面导出状态 |

## 提交示例

```json aixcut_frontend
{
  "action": "export_timeline",
  "timeline_id": "00000000-0000-4000-8000-000000000001",
  "expected_revision": 12,
  "format": "mp4",
  "width": 1920,
  "height": 1080,
  "frame_rate": 30
}
```

```json aixcut_frontend
{
  "action": "export_timeline_status"
}
```

## 结果字段

页面导出的受理结果没有文件地址。状态查询结果包含：

| 字段 | 什么时候有 | 含义 |
| --- | --- | --- |
| `export_id` | 受理后 | 本次导出标识 |
| `state` | 一直有 | `idle`、`running`、`succeeded`、`failed` |
| `format`、`width`、`height`、`frame_rate` | 受理后 | 实际采用的输出参数 |
| `file_name`、`byte_size`、`mime_type`、`elapsed_ms` | `succeeded` | 成片文件名、体积、MIME 和耗时 |
| `error_code`、`error_message` | `failed` | 失败原因 |

`format` 默认是 `mp4`；宽高和帧率不填时使用时间轴画布和帧率。
