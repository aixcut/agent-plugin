# MCP 剪辑提速基线记录

日期：2026-10-12（2026-10-13 补齐实际运行记录）

## 固定版本与输入

- Plugin 仓库：`agent-plugin`
- 分支：`codex/aixcut-plugin-language-and-guidance`
- Plugin 基线提交：`293bb6a60b69f2b7c0f1eb0a22d40ca38790560c`
- MCP Server 健康状态：`ok`，`server_version=1.0.0`，`contract_version=1.0.0`，`build_revision=dev`
- 测试素材目录：`/Users/shenjiawei/Desktop/柠檬水制作/`
- 素材：3 个视频文件，时长分别为 15.083 秒、4.700 秒、5.167 秒；三份素材均包含视频和音频流。
- 素材哈希已在执行日志中固定；完整哈希不在本报告重复保存，避免把测试输入扩散到其他文档。
- 独立基线 Project：`77bf35e2-be92-4497-ae36-e6b57e48de46`，标题为 `MCP提速基线-柠檬水-20261012`。

## 已完成的只读微基线

针对一个已有测试 Project，连续串行读取 `project`、`sources`、`timeline`、`voice`、`captions` 五类视图，每类 3 次，共 15 次；另有一次冷启动项目读取。

| 项目 | 结果 |
| --- | ---: |
| 暖读取总耗时 | 3,083 ms |
| 暖读取平均耗时 | 205.5 ms/次 |
| 单次范围 | 134–363 ms |
| 冷启动项目读取 | 598 ms |
| 成功/失败 | 15/0；冷启动也成功 |
| 服务端 metrics（包含冷启动） | `aixcut_read` 16 次成功 |

按视图的暖读取中位数 / 最小 / 最大：

- `project`：202 / 193 / 363 ms
- `sources`：183 / 146 / 231 ms
- `timeline`：230 / 142 / 257 ms
- `voice`：146 / 134 / 227 ms
- `captions`：206 / 192 / 231 ms

这些数据只说明读取接口在本机当前负载下的调用开销，不能代表完整剪辑耗时，也不能把调用之间的 AI 规划时间归因给 MCP Server。

## 完整流程阻断（2026-10-12 当时）

已创建全新的基线 Project，但在导入素材前检查页面状态得到：

- `presence_connections=0`
- `online_project_pages=0`
- `online_studio_pages=0`
- 没有页面绑定错误，但页面尚未连接到当前 MCP 会话。

当时代码库正在更新，程序未启动，因此那一轮没有导入素材、没有写入时间轴，也没有生成配音或音乐。

## 下一次可继续的动作

1. 代码库更新完成、前端和 MCP 页面可访问后，打开上面的独立 Project。
2. 重新调用 `page_status`，确认 `presence_connections >= 1`。
3. 用官方 local media bridge 一次性导入三份素材，只轮询返回的 `import_ids`。
4. 记录完整工作流各阶段的调用、耗时、等待、失败和重试；保持原声，音乐默认关闭，不生成未经请求的配音。
5. 完成结构、字幕真实性、视觉标注轨道隔离和代表帧核验后，才进入 Plugin 提示词 A/B 优化。

## 2026-10-13 实际运行记录

上面的阻断已解除，完整流程已真实执行一轮。项目里最终产出：1080×1920 画布、主轨 4 段（主持人开场 3s → 桌面食材 4s → 高角度制作 7s → 主持人收尾 2.7s，总长 16.7s）、独立 `Art Text` 标注轨 3 个标签、`B-Roll` overlay 轨 1 个左下角画中画（该轨已静音）。全程未生成 AI 配音或音乐，主持原声保留。

### 观察到的两个硬问题

1. **每次结构写入都需要两次调用。** 画布、主轨、建轨、加文字、加 PiP、摆位置、静音轨道共 7 类写入，第一次全部返回 `MCP_MUTATION_STATUS_UNKNOWN`，第二次（同一幂等键）返回 `NLE_IDEMPOTENCY_CONFLICT`，即第一次实际已提交，只是回执未及时投影。写入往返因此翻倍，且提示标注 `retryable: true`，若换新键重发存在重复写入风险。这是服务端回执问题，提示词无法解决。

2. **字幕链路走不通。** 本地媒体桥导入不自动转录，`caption regenerate` 直接 `noop` 并返回 3 个 `MCP_SOURCE_TRANSCRIPT_MISSING`；显式补 `media.analyze type=transcription` 后，2 个源得到 `empty`（有音轨但无有效人声），第 3 个因页面切换被 `interrupted`。最终 captions 为空。两个子问题：导入路径默认留下 `missing` 而流程仍把字幕当固定阶段；转录任务挂在页面上，页面刷新或被切走即中断。

### 其它摩擦

- 页面在线状态不稳定：出现过 `presence=0`、页面绑到其它 Project、`MCP_FRONTEND_PAGE_NOT_ACTIVE`；`aixcut_open` 只返回待打开地址，宿主浏览器控制不可用时无法自愈。
- 前端文件动作必须带 `params` 记录，`media.list` 不带 `params` 直接 `MCP_ARGUMENTS_INVALID`。
- MCP 没有创建 Motion Graph 资产的入口，箭头/虚线圆圈只能退化为静态文字标签，记为未支持。
- MCP 响应不带服务端耗时，逐调用耗时只能按墙钟估算，混入模型思考时间，不能当纯服务端性能数据。

### 结论

第一步（固定版本 + 端到端跑通）已完成，产出可复现的时间轴与结构。第二步（Plugin 编排提速）尚未开始；服务端回执与转录生命周期问题建议进入第四步专项。

## 当前结论

第一步已完成版本冻结、输入冻结和只读 MCP 微基线，并补跑了一轮完整流程；完整 A/B 对比尚未执行，尚未声称已经提速。
