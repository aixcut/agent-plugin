# Aixcut Codex Plugin

Official Codex and OpenAI plugin distribution for Aixcut.

The repository publishes Aixcut's all-in-one AI video editing plugin for talking-head cuts, livestream clips, e-commerce feed ads, TV commercials, and batch content production. Aixcut Studio supports project-file export to major post-production software.

- `codex/` is the China distribution connected to `https://web.aixcut.cn/mcp`.
- `openai/` is the OpenAI-format China distribution connected to `https://web.aixcut.cn/mcp`.

## Install

Add this repository as a Codex marketplace, then install `aixcut` from the plugin directory:

```bash
codex plugin marketplace add aixcut/agent-plugin --ref main --sparse .agents/plugins --sparse codex
```

For mainland China, use the public Gitee mirror:

```bash
codex plugin marketplace add https://gitee.com/aixcut/agent-plugin.git --ref main --sparse .agents/plugins --sparse codex
```

When adding the Git repository through the desktop plugin UI, leave the sparse-path field empty or enter these two paths on separate lines:

```text
.agents/plugins
codex
```

See [the Codex installation guide](docs/install/codex.md) for connection, authorization, and verification steps.
