# Plugin maintenance

Run this check once at the start of the first Aixcut workflow in a new Codex task. This is a local Git marketplace update check; it is not an MCP call and it must not delay an already-running edit after the check has completed.

## 1. Identify the installed source

List configured marketplaces, then read the JSON plugin inventory from:

```bash
codex plugin marketplace list
codex plugin list --json
```

Find the installed `aixcut` entry in the JSON plugin inventory and read its `marketplaceName`, `version`, `enabled` state, and `marketplaceSource.source` plus `marketplaceSource.sourceType`. Accept only a Git marketplace from one of these official sources:

- International GitHub source: `https://github.com/aixcut/agent-plugin` or the same URL with `.git`（国际 GitHub）。
- Mainland China Gitee source: `https://gitee.com/aixcut/agent-plugin` or the same URL with `.git`（国内 Gitee）。

中文执行规则：使用用户已经配置的来源，不因为当前任务、MCP 地址或网络情况切换国际 GitHub 和国内 Gitee。
不要自动删除插件，不要覆盖 MCP 配置。

Use the source that is already configured. Require `sourceType` to be `git`; if the source type, source URL, or installed entry is missing, unknown, local, or points elsewhere, stop and report it before changing anything. Do not add the other source, switch a user between regions, or infer a source from the current MCP host.

## 2. Refresh and compare

Use the `marketplaceName` returned by the host; do not assume it is `aixcut-marketplace`:

```bash
codex plugin marketplace upgrade "<MARKETPLACE_NAME>" --json
codex plugin list --available --json
codex plugin list --json
```

Compare the installed `aixcut@<MARKETPLACE_NAME>` version with the available version from the same marketplace. If the refresh fails, keep the current plugin and continue only if the requested workflow is safe with the installed version. Do not guess a version from a Git commit or from a different marketplace.

## 3. Ask before changing the installation

If the versions match, report that the plugin is current and continue. If the available version is newer, tell the user both versions and ask for confirmation before running the install/refresh command（先取得用户确认）. Never silently remove the plugin, delete its cache, overwrite MCP configuration, log out, or expose credentials. Preserve the endpoint already declared by the installed package; do not replace a regional MCP configuration with another region.

After confirmation, install or refresh the exact entry:

```bash
codex plugin add "aixcut@<MARKETPLACE_NAME>" --json
```

Read `codex plugin list --json` again and report the resulting version and enabled state. If the host says the plugin is already installed and does not refresh it, stop and report that host limitation; do not remove and re-add it automatically.

## 4. Start a fresh task after an update

The current task may still have the old Skill files loaded. After a successful update, ask the user to start a new Codex task（新建 Codex 任务）, then verify that the new `aixcut-basics` Skill and the Aixcut MCP tools are available before editing. Preserve the existing MCP server and OAuth grant; the plugin update does not require reauthorization unless the host explicitly reports that the grant is unavailable.
