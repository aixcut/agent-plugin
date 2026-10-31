# AIXCut Codex Plugin 自更新检查实施计划

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 让通过 GitHub 或 Gitee marketplace 安装的 AIXCut Codex Plugin 在每次 Aixcut 工作流开始前检查插件版本，在发现更新时由 Codex 请求用户确认并执行刷新、升级和新任务验证。

**Architecture:** 不新增 MCP Tool，也不依赖尚未批准的官方插件目录。维护规则作为两套分发包共同携带的 `aixcut-basics` reference，并由 `aixcut-basics` 在每次工作流入口强制读取。检查从 Codex CLI 的 marketplace 快照和插件清单读取版本；GitHub 国际包、GitHub 国内 `codex/` 包、Gitee 国内镜像分别保留现有仓库和 MCP 配置，不用一个区域配置覆盖另一个区域。

**Tech Stack:** Codex Skill Markdown、JSON manifests、Node.js release-manifest verifier、Node.js `node:test` 静态契约测试、Git marketplace CLI。

---

### Task 1: 固定 GitHub/Gitee 分发基线

**Files:**
- Modify: `agent-plugin` Git refs and working branch only
- Test: `agent-plugin/tests/plugin-maintenance-contract.test.mjs`

**Step 1: Write the failing test**

创建静态契约测试，要求 `codex/` 与 `openai/` 都有维护 reference，基础 Skill 引用该 reference，并且两套 manifest 的插件版本一致；同时断言国内 `codex/.mcp.json` 仍使用 `https://web.aixcut.cn/mcp`，国际 GitHub `openai/mcp.json` 仍使用 `https://web.aixcut.com/mcp`。

**Step 2: Run test to verify it fails**

Run: `node --test tests/plugin-maintenance-contract.test.mjs`

Expected: FAIL because the maintenance reference and entry rule do not exist.

**Step 3: Synchronize sources**

确认 `origin/main` 与 `gitee/main` 已 fetch；以 `origin/main` 为当前实现基线。保留 Gitee 与 GitHub 已存在的差异，尤其是 Gitee 的中国仓库地址和中国 MCP 配置，不把 Gitee 的 `openai/` 国内改动反向覆盖 GitHub 国际包。

### Task 2: 增加插件维护检查规则

**Files:**
- Create: `agent-plugin/codex/skills/aixcut-basics/references/plugin-maintenance.md`
- Create: `agent-plugin/openai/skills/aixcut-basics/references/plugin-maintenance.md`
- Modify: `agent-plugin/codex/skills/aixcut-basics/SKILL.md`
- Modify: `agent-plugin/openai/skills/aixcut-basics/SKILL.md`

**Step 1: Write the failing test**

在契约测试中断言维护文档包含：检查已配置 marketplace、核对 GitHub/Gitee 官方来源、刷新 marketplace、比较已安装与可用版本、发现更新先请求用户确认、升级后新建任务、失败时保留旧安装；同时禁止无确认删除插件、覆盖 MCP 配置、打印令牌或把当前会话当作已加载新版。

**Step 2: Run test to verify it fails**

Run: `node --test tests/plugin-maintenance-contract.test.mjs`

Expected: FAIL because the required maintenance instructions are absent.

**Step 3: Write minimal implementation**

以 `codex/` 和 `openai/` 的基础 Skill 为同一行为源，分别复制维护 reference。规则使用当前插件来源作为权威：GitHub 安装检查 `aixcut/agent-plugin`，Gitee 安装检查 `https://gitee.com/aixcut/agent-plugin.git`；要求 marketplace `sourceType` 为 `git`，若当前 marketplace 来源不明、为本地源或指向其他仓库则暂停并报告。先执行不带 JSON 参数的 `codex plugin marketplace list`，再执行 `codex plugin list --json`；随后执行指定 marketplace 的 `codex plugin marketplace upgrade <name> --json`，最后重新读取 `plugin list --available --json` 和 `plugin list --json`。只在用户明确同意后进行插件升级；升级后要求新建 Codex 任务并重新验证 Skills 与 MCP 工具。

### Task 3: 同步插件版本与发布清单

**Files:**
- Modify: `agent-plugin/codex/.codex-plugin/plugin.json`
- Modify: `agent-plugin/openai/plugin.json`
- Modify: `agent-plugin/codex/contracts/compatibility.json`
- Modify: `agent-plugin/openai/contracts/compatibility.json`
- Regenerate: `agent-plugin/codex/release-manifest.json`

**Step 1: Write the failing test**

扩展契约测试，要求两套包的插件版本已从 `0.2.0` 提升到 `0.3.0`，compatibility 与 release manifest 的版本一致，且 release manifest 的文件摘要覆盖新 reference。

**Step 2: Run test to verify it fails**

Run: `node --test tests/plugin-maintenance-contract.test.mjs`

Expected: FAIL because manifests still declare `0.2.0` and do not include the new file.

**Step 3: Write minimal implementation**

将两套分发包版本统一提升为 `0.3.0`，重新生成实际存在的 `codex/release-manifest.json`；GitHub 主线的 `openai/` 没有 release manifest，不虚构该文件。不改变 `codex/.mcp.json`、`openai/mcp.json` 或 Gitee 国内配置。

### Task 4: 验证两套分发和区域配置

**Files:**
- Test: `agent-plugin/tests/plugin-maintenance-contract.test.mjs`

**Step 1: Run focused contract test**

Run: `node --test tests/plugin-maintenance-contract.test.mjs`

Expected: PASS for both package copies, source-selection rules, confirmation gates, version metadata and regional MCP endpoints.

**Step 2: Run release verification**

Run:

```bash
node codex/scripts/verify-release.mjs --package codex
node --test tests/plugin-maintenance-contract.test.mjs
```

Expected: The release command reports `aixcut@0.3.0`; the contract test passes for both package copies. The OpenAI-format package is checked by the contract test because the current GitHub package does not contain a release manifest.

**Step 3: Inspect diff and source parity**

Run `git diff --check` and compare the changed files against `origin/main` and `gitee/main`. Confirm no domestic endpoint or repository URL was replaced by the international configuration, and no credentials, tokens, or transient logs were added.

### Task 5: Prepare the Gitee domestic mirror update

**Files:**
- Worktree: `/tmp/aixcut-agent-plugin-gitee-update`
- Modify: the same maintenance files and version metadata under the Gitee-based checkout
- Preserve: `openai/mcp.json`, `openai/plugin.json`, `README.md`, and `docs/install/codex.md` domestic repository, homepage, and MCP values

**Step 1: Rebase the Gitee checkout on the synchronized GitHub code**

Merge the fetched `origin/main` into a branch based on `gitee/main` without committing, then keep the Gitee-specific configuration values. Do not push either remote without explicit confirmation.

**Step 2: Apply the same maintenance reference, Skill entry, `0.3.0` version bump, and Codex release-manifest regeneration**

Run the same focused contract test and Codex release verification inside the Gitee checkout. The OpenAI-format package in this checkout must resolve to the domestic `https://web.aixcut.cn/mcp` endpoint and Gitee repository URL.

**Step 3: Inspect the two diffs separately**

Confirm the GitHub checkout keeps `openai` on `aixcut.com` and GitHub, while the Gitee checkout keeps `openai` on `aixcut.cn` and Gitee. The shared maintenance workflow must be identical apart from those regional values.

