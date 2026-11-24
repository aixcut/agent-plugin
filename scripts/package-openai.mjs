#!/usr/bin/env node
/**
 * Clean, self-auditing release packager for the OpenAI / GPT international (.com) plugin.
 *
 * - Places plugin.json and mcp.json at the ZIP root (portable OpenAI plugin layout).
 * - Strips Codex-only host instructions, local-media-bridge.mjs, schema-validators.mjs (244KB),
 *   and <plugin-root> placeholders.
 * - Includes the 5-scenario playbook skill (aixcut-scenarios) so skills match plugin.json copy.
 * - Fails hard if any .cn / gitee.com / codex / NODE_OPTIONS / <plugin-root> / WorkBuddy string leaks.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const openaiRoot = join(repoRoot, "openai");
const scenariosSource = resolve(repoRoot, "../aixcut-workbuddy-plugin/skills/aixcut-scenarios");
const distDir = join(repoRoot, "dist");
const stagingDir = join(distDir, ".staging-openai");

const plugin = JSON.parse(readFileSync(join(openaiRoot, "plugin.json"), "utf8"));
const mcp = JSON.parse(readFileSync(join(openaiRoot, "mcp.json"), "utf8"));
const version = plugin.version;

if (!version) throw new Error("openai/plugin.json missing version");
if (mcp.mcpServers?.aixcut?.url !== "https://web.aixcut.com/mcp") {
  throw new Error(`Expected international .com MCP URL, got: ${mcp.mcpServers?.aixcut?.url}`);
}

rmSync(stagingDir, { recursive: true, force: true });
mkdirSync(stagingDir, { recursive: true });

// 1. Copy core plugin files to ZIP root
for (const file of ["plugin.json", "mcp.json"]) {
  cpSync(join(openaiRoot, file), join(stagingDir, file));
}
cpSync(join(repoRoot, "LICENSE"), join(stagingDir, "LICENSE"));
cpSync(join(openaiRoot, "assets"), join(stagingDir, "assets"), { recursive: true });
cpSync(join(openaiRoot, "references"), join(stagingDir, "references"), { recursive: true });
cpSync(join(openaiRoot, "skills"), join(stagingDir, "skills"), { recursive: true });

// 2. Include 5-scenario skill (aixcut-scenarios) neutralized for OpenAI / ChatGPT
if (!existsSync(scenariosSource)) {
  throw new Error(`Missing scenarios skill source: ${scenariosSource}`);
}
const scenariosTarget = join(stagingDir, "skills/aixcut-scenarios");
cpSync(scenariosSource, scenariosTarget, { recursive: true });
{
  const p = join(scenariosTarget, "SKILL.md");
  let s = readFileSync(p, "utf8");
  s = s.replace(/WorkBuddy 连接卡/g, "OpenAI / ChatGPT 插件连接设置");
  s = s.replace(/WorkBuddy/g, "OpenAI");
  writeFileSync(p, s, "utf8");
}

// 3. Remove Codex-only maintenance reference and sanitize OpenAI skills
rmSync(join(stagingDir, "skills/aixcut-basics/references/plugin-maintenance.md"), { force: true });

const rewrite = (relPath, fn) => {
  const full = join(stagingDir, relPath);
  const before = readFileSync(full, "utf8");
  const after = fn(before);
  writeFileSync(full, after, "utf8");
};

// 3a. aixcut-basics/SKILL.md: remove Codex maintenance + <plugin-root> script command; add aixcut-scenarios routing
rewrite("skills/aixcut-basics/SKILL.md", (s) => {
  let out = s
    .replace(
      /At the start of the first Aixcut workflow in each new Codex task, follow \[plugin maintenance\]\(references\/plugin-maintenance\.md\) once\.[^\n]*\n*/g,
      "",
    )
    .replace(
      /Use packaged `node <plugin-root>\/scripts\/workflow-host\.mjs`\. Validate `EditPlan`, attach `plan_context` to every planned mutation, and follow \[executable workflow\]\(references\/workflow-host\.md\)\./g,
      "Follow [executable workflow](references/workflow-host.md), validate your EditPlan before mutating, and attach `plan_context` to every planned mutation.",
    );
  if (!out.includes("aixcut-scenarios")) {
    out += "\n## Scenario playbooks\n\nFor livestream clips, e-commerce feed ads, TVC commercials, or matrix batch production, load `aixcut-scenarios` first to select the matching scenario playbook.\n";
  }
  return out;
});

// 3b. aixcut-basics/references/workflow-host.md: remove <plugin-root> and host:"codex"
rewrite("skills/aixcut-basics/references/workflow-host.md", () => `# Executable Workflow Discipline (OpenAI Host)

Follow the staged editing lifecycle: \`intent -> inspect -> plan -> execute -> verify -> deliver\`.

1. **Plan before editing**: Build a clear \`EditPlan\` bound to the current \`project_id\`, \`timeline_id\`, and \`base_revision\`, and attach \`plan_context\` to planned mutations.
2. **Batch writes & read back**: Group independent edits into bounded batches, read back the updated \`revision\` after each batch, and never replay already-applied steps on retry.
3. **Verify before delivering**: Collect structural, semantic, visual, and audio evidence bound to the latest \`project_id\`, \`timeline_id\`, and \`revision\`. Report any unverified dimension honestly as \`unjudgeable\`.
4. **Handoff & resume**: If the host session does not provide durable cross-turn storage, summarize the current \`project_id\`, \`timeline_id\`, \`revision\`, completed steps, and next step clearly so work can resume cleanly.
`);

// 3c. aixcut-verification/SKILL.md: remove <plugin-root>/scripts/workflow-host.mjs
rewrite("skills/aixcut-verification/SKILL.md", (s) =>
  s.replace(
    /Before reporting the requested deliverable, run the packaged Core gate with `node <plugin-root>\/scripts\/workflow-host\.mjs gate`[^\n]*\n/g,
    "Before reporting the requested deliverable, verify that all collected evidence (structural, semantic, visual, and audio) is bound to the latest inspected `project_id`, `timeline_id`, and `revision`. Do not claim pass for any unverified dimension; mark it `unjudgeable` and state what inspection is still needed.\n",
  ),
);

// 3d. aixcut-mcp-logout/SKILL.md: replace codex CLI logout with OpenAI connector disconnect
rewrite("skills/aixcut-mcp-logout/SKILL.md", (s) =>
  s.replace(
    /Clear the local credential with `codex mcp logout aixcut`/g,
    "Instruct the user to disconnect or revoke the Aixcut plugin credential in their OpenAI / ChatGPT connector settings",
  ),
);

// 3e. aixcut-projects/SKILL.md: replace Codex Desktop / codex exec / Codex Host references
rewrite("skills/aixcut-projects/SKILL.md", (s) =>
  s
    .replace(/Never use `codex exec`, a subagent, another MCP client, or a plain Project URL as a substitute/g, "Never use a subagent, another MCP client, or a plain Project URL as a substitute")
    .replace(
      /After a successful call, immediately open the complete `result\.browser_handoff\.url` with Codex Desktop's official browser-opening capability\. This Skill supplies the Codex opening arguments locally:\s*```javascript[\s\S]*?```/g,
      "After a successful call, present or open the complete `result.browser_handoff.url` using the host's browser-opening capability so the user enters the bound Aixcut Studio project page directly.",
    )
    .replace(/the Codex Host completes OAuth/g, "the host completes OAuth"),
);

// 3f. aixcut-timeline-editing/SKILL.md: remove ~/.codex/plugins local-media-bridge section and scripts/download-capture-artifacts.mjs reference
rewrite("skills/aixcut-timeline-editing/SKILL.md", (s) =>
  s
    .replace(/### Import an explicit local path[\s\S]*?(?=### Upload through a temporary link)/g, "")
    .replace(
      /Use this only when the current environment cannot start or connect the headed browser and local media bridge\. This is an automatic fallback, not a user-selected upload mode\./g,
      "Use this when the user needs to upload local files from their device to the Aixcut project.",
    )
    .replace(
      /If the bridge is unreachable, follow the bounded recovery above: rerun the helper for a fresh URL and retry once before offering the manual upload path\./g,
      "When local files are needed, use `prompt_add_material`, `aixcut_upload_link`, or direct agent upload (`prepare_upload` / `complete_upload`).",
    )
    .replace(
      /To save them locally, pass the exact JSON Tool result through stdin to `scripts\/download-capture-artifacts\.mjs <output-directory>`\. Report a local path only after the helper succeeds; the remote MCP server does not write files to the local machine\./g,
      "Inspect the returned temporary JPEG URLs directly for visual verification; the remote MCP server does not write files to the user's local machine.",
    ),
);

// 3g. Neutralize remaining Codex Host / Codex Desktop phrasing across all skills
const walkFiles = (dir, base = dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(relative(base, full));
  }
  return out;
};
for (const rel of walkFiles(join(stagingDir, "skills"))) {
  if (!rel.endsWith(".md")) continue;
  rewrite(join("skills", rel), (s) =>
    s
      .replace(/The Codex Host/g, "The host")
      .replace(/the Codex Host/g, "the host")
      .replace(/\(Codex Desktop\)/g, "(the host browser)")
      .replace(/their Codex specialist Skills/g, "their specialist Skills"),
  );
}

// 4. Strict self-audit of every file in stagingDir
const walk = (dir, base = dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, base));
    else out.push(relative(base, full));
  }
  return out;
};

const files = walk(stagingDir);
const forbiddenPatterns = [
  { name: "aixcut.cn", re: /aixcut\.cn/i },
  { name: "gitee.com", re: /gitee\.com/i },
  { name: "codex reference", re: /\bcodex\b/i },
  { name: "NODE_OPTIONS", re: /NODE_OPTIONS/ },
  { name: "<plugin-root>", re: /<plugin-root>/ },
  { name: "WorkBuddy", re: /WorkBuddy/i },
];

const violations = [];
for (const rel of files) {
  const full = join(stagingDir, rel);
  const size = statSync(full).size;
  if (size > 100 * 1024 && !rel.endsWith(".svg") && !rel.endsWith(".png")) {
    violations.push(`${rel}: unexpectedly large text/script file (${size} bytes)`);
  }
  if (/\.(json|md|mjs|js|txt|svg)$/i.test(rel)) {
    const content = readFileSync(full, "utf8");
    for (const { name, re } of forbiddenPatterns) {
      if (re.test(content)) violations.push(`${rel}: matched forbidden pattern "${name}"`);
    }
  }
}

if (violations.length > 0) {
  console.error("OpenAI release audit FAILED:\n" + violations.map((v) => `  - ${v}`).join("\n"));
  process.exit(1);
}

// 5. Normalize timestamps and zip with plugin.json & mcp.json at ZIP root
const fixed = new Date("2026-01-01T00:00:00Z");
const normalizeTimes = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) normalizeTimes(full);
    utimesSync(full, fixed, fixed);
  }
};
normalizeTimes(stagingDir);

mkdirSync(distDir, { recursive: true });
const zipName = `aixcut-gpt-openai-com-${version}.zip`;
const zipPath = join(distDir, zipName);
rmSync(zipPath, { force: true });
execFileSync("/usr/bin/zip", ["-X", "-q", "-r", zipPath, ...readdirSync(stagingDir)], { cwd: stagingDir });

const checksum = createHash("sha256").update(readFileSync(zipPath)).digest("hex");
writeFileSync(`${zipPath}.sha256`, `${checksum}  ${zipName}\n`, "utf8");
rmSync(stagingDir, { recursive: true, force: true });

console.log(`Built & audited ${zipName}: ${files.length} files, ${statSync(zipPath).size} bytes (SHA-256: ${checksum})`);
