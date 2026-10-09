---
name: aixcut-timeline-editing
description: 编辑 Aixcut 时间轴的片段、文字、音频、轨道和画布，以及提示用户上传本机素材。用户要求剪切、拼接、裁剪、删除片段、复制片段、换素材、调时长、静音、加文字、加音乐、调轨道、改画布或添加本机素材时使用。不用于写配音文稿、整片编排和导出成片。（英文：cut clip、trim、add music、add text、track、canvas）
---

# Aixcut 时间轴编辑

必须调用真实的 MCP 工具。禁止用 curl、JSON 描述、直写数据库或本地文件重建替代用户要求的工具调用。

配音、字幕和导出各有专门技能，不在这里展开：配音见 `aixcut-voice`，字幕见 `aixcut-captions`，导出见 `aixcut-export`。

## 最短路径

1. 读取任务需要的全部 view，只使用返回的稳定 ref，禁止猜 ID。
2. 为每个新的写入意图生成新的 UUID v4 `idempotency_key`。
3. 调用范围最窄且匹配意图的写工具。
4. 写入成功后重新读取受影响的 view；需要时用 `aixcut_review` 检查结构和画面。
5. 报告真实结果：`result.status`、`result.mutation_id`、`result.operation_id`、`result.revision_after`、`result.created`、`result.removed`、`result.ref_map`、`result.warnings`。没有出现的字段表示该项为空。

## 多时间轴与多版本

- 用户提出多个版本、A/B 对比、横竖版、平台适配、不同风格，或“保留原版再做一版”时，先调用 `aixcut_timeline(action="list")`。
- 需要新版本时调用 `aixcut_timeline(action="duplicate", source_timeline_id=...)` 复制完整时间轴；只有用户明确要空白版本时才用 `create`。
- 复制会保留轨道、片段、文字、特效、转场、遮罩和动画，并给所有内部关系生成新 ID；同一 Project 的素材只生成或导入一次。
- 从 `list` 或 `read` 得到目标 `timeline_id` 后，一次编辑命令只操作这一条时间轴；所有后续 `read`、编辑、截帧和审查都继续带同一个 `timeline_id`。不要依赖浏览器当前显示的时间轴。
- 单版本任务不创建额外时间轴。完成每个版本后分别读回和审查，不把不同时间轴的 ref 混用。

## Tool 选择

| 意图 | 工具 |
| --- | --- |
| 读取、审查 | `aixcut_read`、`aixcut_review` |
| 主视频轨 | `aixcut_primary` |
| 口播 | `aixcut_speech` |
| 视频、图片、Motion Graph 片段 | `aixcut_clip` |
| 普通文字 | `aixcut_text` |
| 音频（音乐、音效、旁白音频片段） | `aixcut_audio` |
| 轨道本身 | `aixcut_track` |
| 画布和全清理 | `aixcut_project` |
| 远端浏览器动作 | `aixcut_frontend` |

只发送所选工具 Schema 声明的字段。`speech` 只操作主口播轨，`text` 不操作字幕。

结构变化后，依赖位置的下一条命令必须重新读取。

## 幂等

- 按字面含义处理 `applied`、`noop` 和 `applied_with_warning`。
- 回包带 `duplicate: true` 表示这次**没有写入**：同一个 UUID 上一次已经生效，本次结果沿用第一次。这是正常重放，不是新改动，不要当成刚改完。
- `status_unknown` 时保留全部原参数并复用同一 UUID。
- 禁止把同一 UUID 用于不同参数或不同意图；同一个 UUID 换了内容会报 `NLE_IDEMPOTENCY_CONFLICT`，此时换新 UUID 重新生成操作。

## 画布

新建 Project 的画布是 `0×0`，需要第一条画面素材或人手动确认才有尺寸。MCP 第一次往时间轴写内容时会自动落定画布：优先用本批新增片段引用的画面素材尺寸，其次用项目里已有的画面素材，都没有才退到 `1920×1080`。

- 回包 `warnings` 里有 `MCP_CANVAS_DEFAULTED`，说明用的是默认 `1920×1080`；竖屏或其它比例要用 `aixcut_project action=canvas` 显式覆盖。
- 用户已经指定过画布时不会被自动覆盖。

## 音频

加背景音乐、音效或已合成的旁白音频都走 `aixcut_audio`：

- `add` 往音频轨放片段；同一时刻多条音频轨是并行混音，不是互相覆盖。
- 音乐类片段两端加淡入淡出，用 `fade` 动作的 `fade_in_ms`、`fade_out_ms` 设置。
- 有讲解声时用 `update` 的 `volume` 压低音乐（0–1），保证人声清楚。
- 裁剪、拆分、移位分别用 `trim`、`split`、`move` 或 `time`。

## 轨道

- 放音频前先确认音频轨存在，没有就用 `aixcut_track` 的 `ensure`。
- `ensure` 回包成功后客户端会回查一次时间轴：轨道不在就报 `MCP_TRACK_ENSURE_NOT_APPLIED`（常见于旧 UUID 命中旧回执、而轨道后来被删）。换新 UUID 重发一次即可。
- 轨道可以整体静音或停用，改之前先读回确认当前状态。

## 本机素材

素材导入分三条路：用户自己点、页面自己去取、文档入库。前两条是**受理即回**，回包只代表页面接下了文件，不代表素材已经进了项目；第三条见 `aixcut-documents`。

### 路一：让用户自己上传

```json aixcut_frontend
{"action":"prompt_add_material"}
```

回包 `status` 是 `completed`，表示当前 Project 页面的上传框已经打开，此时项目里还没有任何新素材。随后告诉用户：「上传框已打开，请点击上传区域选择文件，或将文件拖入上传框完成上传。」文件选择和上传必须由用户完成。

### 路二：用户给了本机文件路径

用户明确给出本机文件路径时，不用让用户点上传框。先让本机桥把这几个文件端出来。

桥脚本装在 Aixcut 插件包内，不要假设当前目录能找到它，先定位再运行：

```bash
BRIDGE=$(find ~/.codex/plugins -maxdepth 6 -name local-media-bridge.mjs 2>/dev/null | head -1)
SITE_ORIGIN="<MCP Server instructions 中的 Site origin>"
node "$BRIDGE" /绝对路径/a.mp4 /绝对路径/b.mp4 /绝对路径/c.mp4 --allowed-origin "$SITE_ORIGIN"
```

`SITE_ORIGIN` 必须取自当前已连接 MCP Server 的初始化说明，不能根据页面路径猜、不能询问用户，也不要加 `/studio`。如果初始化说明没有提供 Site origin，不要启动本机桥，改用路一的页面上传。

命令会打印 JSON，里面有每份文件的 `files[].url`。**把所有 url 放进一次调用**，一次最多 8 个：

```json aixcut_frontend
{"action":"import_local_media","urls":["<url 1>","<url 2>","<url 3>"]}
```

只有一个文件时用单数形式（`{"action":"import_local_media","url":"<url>"}`），回包是 `file_name`；多个文件时用 `urls`，回包是 `file_names`，顺序和传入顺序一致。

- 一次调用受理整批，不要一个文件发一次。导入是一条队列，分开发只会让排在后面的文件更晚开始。
- 批里某个文件取不到时，回包会带 `failures: [{url, message}]`，其余文件照常受理。只对失败的那几个文件解释原因，不要因为一个文件失败就重发整批。
- 批里所有 url 都取不到时整条调用失败，回到路一让用户手动上传。

- 这条命令自己后台化，不需要 `&`、`screen` 之类的写法，也不需要自己选端口。
- 已经在跑的桥如果已经覆盖这些文件，它会直接复用并打印 `reused: true`，不会起第二个进程，也不会换端口让旧 url 失效。
- 换文件再跑一次即可，新桥会接着服务之前那些文件。
- 想知道桥在不在跑用 `--status`，用完想关掉用 `--stop`。正常导入不要求关桥，也不要为了让桥活着去套 `screen`、`nohup` 或 `&`。
- 桥有 2 小时有效期，到期自己退出并清理状态，不会留下占端口的孤儿进程。想让它多活一会就传 `--ttl-ms`。
- url 只能取自打印结果，不要自己拼地址，也不要猜端口。
- 桥起不来或取不到文件时，回到路一让用户手动上传，不要反复重试。

### 受理之后只有一套确认步骤

路一和路二都是受理即回：回包 `status` 是 `accepted`，导入在后台继续；有音频的视频会另外触发转录。不要用回包时间推断画面已经被服务端完整理解。

**两条路的查法不一样，别混：**

**路二（`import_local_media`）按 `import_id` 查，这是唯一正确的收尾方式。**

受理回包带 `import_ids`（批量时还有 `file_names`）。之后每一次都只查这些 id：

```json aixcut_frontend
{"action":"import_status","import_ids":["<受理回包里的 import_id>"]}
```

回包 `result.data.imports[]` 每条有 `import_id`、`file_name`、`status`、`progress`、`settled`、`private_copy`，成功时还有 `media_id`。`status` 只有 `ready`、`failed`、`cancelled` 三者算结束（`settled: true`），其余值都还在进行中：

1. 按回包 `next_action` 的 `after_seconds` 等一会再查；`settled` 是 `false` 就继续等同一个 id 再查，不要换 id，也不要重发导入。素材越大上传越久，慢不代表失败。
2. `status` 变成 `ready` 时，用返回的 `media_id` 直接进入下一步，不必再去 `view=sources` 里找。
3. `status` 是 `unknown` 说明页面已经不跟踪这个导入了（页面刷新过或会话换过）：退回 `aixcut_read(view="sources")`，用 `file_name` 对一下，确认到底进没进。
4. `failed` / `cancelled` 条目会带 `error_code` / `error_message` / `retryable`。`retryable` 为 `true` 才重新发起导入；否则如实报告失败原因，不要闷头重试。
5. `private_copy` 说的是**本机完整副本**，和 `status` 是两回事，别混：
   - `copying`：受理回包时副本还在后台写，这是正常状态，不是失败。继续按 `next_action` 的间隔查同一个 id。
   - `ok`：副本已经写好，页面刷新后这份素材还能读。
   - `fallback`：**没有留下本机完整副本**（页面存储空间不够或复制失败）。素材仍可用，但页面刷新后可能读不了，页内导出可能取不到完整源；回包里的 `private_copy_reason` 要如实告诉用户。
   - 收尾判据是「`settled` 为 `true` 且 `private_copy` 不再是 `copying`」；只看 `status` 会在落盘还没写完时就当成安全。

**路一（`prompt_add_material`）没有 `import_id`**，用户手选的文件不回报 id，只能回读：

1. 等用户说上传完成后，读 `aixcut_read(view="sources")`。清单里每条素材有 `media_id`、`file_name`、`transcript_status`，用 `file_name` 对上刚加的那份。
2. 列表里还没有这份素材，说明文件还在上传：再等 15 秒重读，直到它出现。**不要重发 `prompt_add_material`**。

**两条路共同的收尾：**

- 素材已在列表但逐字稿状态不是 `available` 时，不要读取 `source_lines`；按 `aixcut-known-errors` 处理。没有逐字稿不等于不能理解画面，需要视觉判断时用 `capture_source_frames` 或 `capture_timeline_frames` 按需取帧。
- 永远不要为了确认导入成功而重发 `import_local_media` 或 `prompt_add_material`，那会往项目里加第二份。

### 导入之后的三个既定事实

- **本机导入不走完整视频上传。** 浏览器持有本机视频原片；有音频时只提取音频上传到 ClipOS 做转录，画面理解由 `capture_source_frames` / `capture_timeline_frames` 按需生成帧。不要求服务端存在完整视频副本，也不要把“全量上传”当成 AI 理解的前置步骤。
- **本机副本是页内导出的唯一完整源，只有删素材或删项目才释放。** `private_copy` 为 `ok` 时，浏览器私有存储里留着一份完整副本。把素材从项目里移除不释放它（素材还在素材库里）；素材从素材库删除、或者它所在的项目被删掉时才会释放。用户能在素材面板上看到「本机副本 N 份 · 占用 X」，跟用户解释占用时以那里为准。
- **素材访问授权可能失效。** 页面刷新或换浏览器后，抽帧会收到 `CAPTURE_PERMISSION_REQUIRED`：让用户在项目页面上点一次任意位置（页面里的「立即修复」也行），再原样重试，不要重新导入素材。

## 截帧

`capture_source_frames` 或 `capture_timeline_frames` 会在 `result.data.artifacts[]` 返回临时 JPEG 下载地址。保存到本地时，把准确的工具 JSON 结果通过 stdin 传给 `scripts/download-capture-artifacts.mjs <output-directory>`。只有脚本成功后才能报告本地路径，禁止声称远端 MCP Server 直接写入了本地文件。

抽帧需要页面在线并且素材可以访问。页面不在线时先用只读探针 `aixcut_frontend action=page_status` 判断是哪种：`presence_connections` 为 0 就是没有活跃页面连接，`online_project_pages` 为 0 而 `online_studio_pages` 大于 0 就是开着别的页面，`pages` 里有别的 project 就是开着别的 Project。`presence_connections=0` 时停止并让用户在同一 MCP 会话中打开或切到目标 Project，不得自动重复打开页面；用户完成后只重试一次。仍失败就如实说明截不了帧，不要用结构检查冒充画面确认，也不要反复重试同一个请求。

## 认证

缺少授权时由 Codex Host 在传输层完成 OAuth 并恢复原请求。不要先调用 `aixcut_login`，不要重复业务调用。授权或 Project ownership 失败时如实报告，禁止绕过访问控制。

## 参数查表

字段细节见 [references/actions.md](references/actions.md)。
