# Aixcut Agent Plugins

Official workflow Skills and host packages for connecting Codex and other AI agents to Aixcut.

The plugin package installs the official instructions and any required local helpers. Aixcut tools run in the hosted MCP service. Follow the setup guide for the Aixcut website you use to configure its matching `/mcp` endpoint and authorize your account. Opening a Project is only a handoff request; page-bound actions must wait for `aixcut_frontend(action="page_status")` to show the target Project online. Voice script/settings writes are page-free, while voice rendering requires the bound Project page.

## Codex

The Codex marketplace package is `aixcut-codex-plugin`. Add this repository as a marketplace, install that package, then follow your Aixcut website's official guide to connect the matching MCP endpoint. The shared plugin package does not embed a site-specific MCP URL. See [the Codex installation guide](docs/install/codex.md).

GitHub is the source of truth. The `main` branch and tags are mirrored to Gitee at `https://gitee.com/aixcut/agent-plugin` for installation from mainland China. The Gitee mirror must remain publicly readable because public marketplace installation cannot use private-repository credentials.

## Development

`aixcut-plugin-core` is the single source of truth for host-neutral helpers and the MCP catalog snapshot. Codex stores a verified snapshot in `vendor/plugin-core` and locks its version and digest via `contracts/core-lock.json`; builds read only the snapshot in this repository. Core is a development-time source repository and does not need to be deployed or installed by users. Codex Skills, the manifest, and marketplace configuration remain in this repository, while WorkBuddy maintains its own host content independently.

When updating the snapshot, explicitly run `npm run core:update -- --core-root ../aixcut-plugin-core`, review the diff, and then run the relevant tests and validation. `npm run core:verify` checks the lock file and file digests. The MCP Server remains the authoritative source for tool schemas and actions; cross-repository checks verify that the Core snapshot matches the server contract.

```bash
npm install
npm test
npm run build
npm run validate
npm run check
```
