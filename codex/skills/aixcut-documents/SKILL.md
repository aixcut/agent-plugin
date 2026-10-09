---
name: aixcut-documents
description: 把本机文档导入 Aixcut Project 的文档库，导入后出现在 Studio 文档面板，原件和正文都留在项目里。用户明确给出文档路径并要求放进项目、收进文档库或加进资料时使用。不用于图片、视频、音频素材，也不用于只是读取文档内容。（英文：import document、add pdf to project）
---

# 文档导入

## 何时用

只在用户**明确给出本机文档路径**、并要把这份文档放进 Project 文档库时调用 `aixcut_document`。

- 只是让 AI 读文档、总结或回答问题：自己读文件，不要调用这个工具。
- 用户没给路径：先问路径。不要猜路径，不要扫描目录，不要拿文件名编一份内容。
- 图片、视频、音频是素材，不是文档：走 `aixcut_frontend` 的素材通道，不要用这个工具。

## 正文内容规则

| 文件类型 | `content` |
| --- | --- |
| markdown、txt、csv、tsv | 可省略。省略时工具直接读文件正文，比复述更准。 |
| pdf、Word、PPT、Excel、HTML、RTF | 必填。服务端不解析文件，必须由你读文件后产出 markdown 正文再传。 |

- `content` 必须是你真实读到的内容，不能凭文件名猜、不能编、不能只写摘要。
- 该传 `content` 却没传会报 `MCP_DOCUMENT_CONTENT_REQUIRED`。
- 文本文件不是合法 UTF-8 时报 `MCP_DOCUMENT_ENCODING_INVALID`：自己读文件，把正文放进 `content` 再传一次。
- 支持的类型是固定白名单：markdown、txt、csv、tsv、html、pdf、Word、PPT、Excel、rtf。白名单外的文件（例如 zip、视频）会报 `MCP_DOCUMENT_MIME_UNSUPPORTED`，如实告诉用户，不要改扩展名硬传。

## 调用

```json aixcut_document
{"action":"import","file_path":"/Users/me/notes/产品说明.md"}
```

```json aixcut_document
{"action":"import","file_path":"/Users/me/docs/季度复盘.pdf","content":"# 季度复盘\n\n正文 markdown"}
```

- `file_path` 必须是本机绝对路径，相对路径会报 `MCP_DOCUMENT_PATH_INVALID`。
- `file_name` 用来改文档面板里的显示名，省略时用文件自己的名字。
- `mime_type` 只在扩展名缺失或写错时补。
- 省略 `project_id` 时导入当前 Project。
- 这个工具没有 `idempotency_key`，也不要传：重复导入靠内容去重，不靠幂等键。

## 落库事实

- 原文件整份上传，用户之后仍能打开或下载原件；正文单独存一份。
- 同一份内容重复导入返回 `deduped`，不会新增副本；换名字但内容相同也算重复。
- 上限：单个文件 200 MiB，入库正文 32 MiB。
- 落库结果在 `result.data.document`：`doc_id`、`relative_path`、`display_name`、`source`、`parse_status`、`content_hash`。`result.status` 是 `imported`（新文档）或 `deduped`（命中已有内容）。
- 文档进的是项目文档库，不会自己出现在时间轴上；打开 Studio 文档面板就能看到。

## 失败怎么处理

| 错误码 | 处理 |
| --- | --- |
| `MCP_DOCUMENT_PATH_INVALID`、`MCP_DOCUMENT_NOT_FOUND` | 路径不对或文件不在了，问清楚再试。 |
| `MCP_DOCUMENT_EMPTY`、`MCP_DOCUMENT_TOO_LARGE` | 文件本身为空或超限，换文件。 |
| `MCP_DOCUMENT_MIME_UNSUPPORTED` | 类型不在支持列表里，如实告诉用户，不要改成别的类型硬传。 |
| `MCP_DOCUMENT_CONTENT_REQUIRED`、`MCP_DOCUMENT_ENCODING_INVALID`、`MCP_DOCUMENT_CONTENT_TOO_LARGE` | 补 `content` 或压缩正文后重试。 |
| `MCP_DOCUMENT_UPLOAD_FAILED` | 传输问题，可以用同一份文件原样重试一次；再失败就报给用户。 |

路径、文件和类型问题（前三行）在改参数或换文件之前，原样重发不会成功。
