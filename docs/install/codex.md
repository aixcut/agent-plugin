# 在 Codex 中安装 AIXCut 插件

插件包提供 AIXCut 官方 Skills 和必要的本机辅助脚本。AIXCut 的编辑、生成和项目操作由 MCP 服务端在线执行；安装插件本身不会替你选择站点、配置 MCP 地址或完成账号授权。

## 1. 添加插件源并安装

在 Codex CLI 中添加 GitHub 插件源：

```bash
codex plugin marketplace add aixcut/agent-plugin --ref main --sparse .agents/plugins --sparse codex
```

然后打开 Codex 插件目录：

```text
/plugins
```

找到并安装 **Aixcut** 插件。也可以在 Codex 桌面应用的 Plugins Directory 中，从已添加的 marketplace 选择并安装。

## 2. 连接你正在使用的 AIXCut 站点

打开对应 AIXCut 官网的 Codex/MCP 连接指南，按指南把该站点提供的 `/mcp` 地址添加到 Codex，并完成 OAuth 授权。不要把别的站点地址复制过来；插件仓库不会预设任何站点的 MCP URL。

## 3. 验证并开始使用

在 Codex 新对话中确认 AIXCut MCP 工具已连接，再提出自然语言任务，例如“打开我的 AIXCut 项目并先检查时间轴”。Skills 会指导 Codex 选择工具和按安全顺序操作；实际工具能力以已连接服务端返回的工具列表为准。

## 本机素材

当工作流需要读取本机文件时，插件内的 `local-media-bridge.mjs` 会在用户电脑上启动 loopback 文件桥，并只提供本次明确选择的文件。当前官网 Origin 由已连接的 MCP 服务自动提供给流程提示词，桥只允许这个官网读取文件。桥接脚本不替代线上 MCP 服务，也不直接修改线上项目；素材导入仍通过已连接的 AIXCut 页面和服务完成。
