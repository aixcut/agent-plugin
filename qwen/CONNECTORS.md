# Aixcut 外部工具连接说明

| 能力类别 | 服务名称 | 配置方式 |
| --- | --- | --- |
| AI 视频剪辑与时间线（MCP） | Aixcut (`aixcut`) | 自定义远程 MCP：`https://web.aixcut.cn/mcp`（OAuth 登录授权） |
| 网页时间线预览与导出 | Aixcut Studio | 通过 `aixcut_open` 返回的一次性交接链接打开 |

## 快速连接

在千问办公版中通过自定义 MCP 连接器添加：
- **服务名称**：`aixcut`
- **MCP URL**：`https://web.aixcut.cn/mcp`

授权完成后开启新对话即可使用。
