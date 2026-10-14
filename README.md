# Aixcut Agent Plugins

Official workflow Skills and host packages for connecting Codex and other AI agents to Aixcut.

The plugin package installs the official instructions and any required local helpers. Aixcut tools run in the hosted MCP service. Follow the setup guide for the Aixcut website you use to configure its matching `/mcp` endpoint and authorize your account. Opening a Project is only a handoff request; page-bound actions must wait for `aixcut_frontend(action="page_status")` to show the target Project online. Voice script/settings writes are page-free, while voice rendering requires the bound Project page.

## Codex

The Codex marketplace package is `aixcut-codex-plugin`. Add this repository as a marketplace, install that package, then follow your Aixcut website's official guide to connect the matching MCP endpoint. The shared plugin package does not embed a site-specific MCP URL. See [the Codex installation guide](docs/install/codex.md).

## Development

`aixcut-plugin-core` 是宿主中立 Helper 与 MCP catalog 快照的唯一维护源。Codex 在 `vendor/plugin-core` 保存经校验的快照，并通过 `contracts/core-lock.json` 锁定版本与摘要；构建只读取本仓库快照。Core 是开发期源码仓库，不需部署或由用户安装。Codex Skills、manifest 与 marketplace 配置继续归本仓库，WorkBuddy 独立维护自己的宿主内容。

更新快照时显式运行 `npm run core:update -- --core-root ../aixcut-plugin-core`，审查 diff 后执行相关测试与校验。`npm run core:verify` 检查锁文件和文件摘要。Tool schema/action 的权威源仍是 MCP Server，跨仓库检查用于确认 Core 快照与服务端契约一致。

```bash
npm install
npm test
npm run build
npm run validate
npm run check
```
