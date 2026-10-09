# Aixcut Agent Plugins

Official workflow Skills and host packages for connecting Codex and other AI agents to Aixcut.

The plugin package installs the official instructions and any required local helpers. Aixcut tools run in the hosted MCP service. Follow the setup guide for the Aixcut website you use to configure its matching `/mcp` endpoint and authorize your account.

## Codex

The Codex marketplace package is `aixcut-codex-plugin`. Add this repository as a marketplace, install that package, then follow your Aixcut website's official guide to connect the matching MCP endpoint. The shared plugin package does not embed a site-specific MCP URL. See [the Codex installation guide](docs/install/codex.md).

## Development

```bash
npm install
npm test
npm run build
npm run validate
```
