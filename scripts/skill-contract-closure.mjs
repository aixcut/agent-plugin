import { access, readFile, readdir, realpath } from "node:fs/promises";
import { join, resolve } from "node:path";

const DEFAULT_FORBIDDEN_HOST_TEXT = ["mcp__", "localhost", "aixcut.cn", "aixcut.com/mcp", "api_key", "access_token"];

const asCatalogMap = (catalog) => new Map((catalog.tools ?? []).map((tool) => [tool.name, new Set(tool.actions ?? [])]));
const error = (message) => { throw new Error(`Skill contract closure failed: ${message}`); };
const selectorFor = (tool) => tool === "aixcut_read" || tool === "aixcut_review" ? "view" : tool === "aixcut_open" ? "target" : "action";

function shouldIgnoreLine(line) {
  const lower = line.toLowerCase();
  return /(?:do not|don't|never|禁止|不要|历史|historical|removed|旧版|invalid|反例|forbidden|不可调用)/i.test(lower);
}

function invocations(text) {
  const found = [];
  // Structured examples are authoritative, including examples in referenced files.
  const fence = /```(?:json|javascript|js)?\s+([a-z][a-z0-9_]*)([^\n]*)\n([\s\S]*?)```/gi;
  for (const match of text.matchAll(fence)) {
    const tool = match[1];
    if (shouldIgnoreLine(match[2])) continue;
    try {
      const value = JSON.parse(match[3]);
      if (value && typeof value === "object") found.push({ tool, input: value, source: "structured" });
    } catch {
      // Non-JSON examples are prose and are checked by the inline call parser below.
    }
  }
  // Inline calls are checked unless the whole line explicitly marks them as negative/history.
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    for (const match of line.matchAll(/\b(aixcut_[a-z_]+)\s*\(\s*([^)]*)\)/g)) {
      const prefix = line.slice(0, match.index ?? 0).split(/[.!?。！？]/).at(-1) ?? "";
      if (shouldIgnoreLine(prefix)) continue;
      const input = {};
      for (const field of match[2].matchAll(/\b(action|view|target)\s*=\s*["']([^"']+)["']/g)) input[field[1]] = field[2];
      if (/^[a-z][a-z0-9_.]*(?:\/[a-z][a-z0-9_.]*)*$/.test(match[2].trim())) {
        for (const action of match[2].trim().split("/")) found.push({ tool: match[1], input: { [selectorFor(match[1])]: action }, source: `line ${index + 1}` });
      }
      found.push({ tool: match[1], input, source: `line ${index + 1}` });
    }
    for (const match of line.matchAll(/`(aixcut_[a-z_]+)`/g)) {
      const prefix = line.slice(0, match.index ?? 0).split(/[.!?。！？]/).at(-1) ?? "";
      if (!shouldIgnoreLine(prefix)) found.push({ tool: match[1], input: {}, source: `line ${index + 1}` });
    }
    const table = line.match(/^\s*\|\s*(aixcut_[a-z_]+)\s*\|\s*([a-z][a-z0-9_.]*)\s*\|/);
    if (table && !shouldIgnoreLine(line.slice(0, line.indexOf("|")).trim())) found.push({ tool: table[1], input: { [selectorFor(table[1])]: table[2] }, source: `table line ${index + 1}` });
  }
  return found;
}

function checkInvocation(entry, toolMap, invocation) {
  const { tool, input, source } = invocation;
  const callable = new Set([...(entry.tools?.required ?? []), ...(entry.tools?.optional ?? [])]);
  const forbidden = new Set(entry.tools?.forbidden ?? []);
  if (forbidden.has(tool)) error(`${entry.skill} calls forbidden Tool ${tool} (${source})`);
  if (!callable.has(tool)) error(`${entry.skill} calls undeclared Tool ${tool} (${source})`);
  const actions = toolMap.get(tool);
  if (!actions) error(`${entry.skill} calls unknown Tool ${tool} (${source})`);
  const selector = selectorFor(tool);
  for (const name of ["action", "view"]) if (name !== selector && name in input) error(`${entry.skill} uses wrong selector ${name}; ${tool} expects ${selector}`);
  const action = input[selector];
  if (action && !actions.has(action)) error(`${entry.skill} references unknown ${tool}.${action} (${source})`);
}

async function ensureContainedReference(skillRoot, skillName, reference) {
  const path = resolve(skillRoot, skillName, reference);
  const base = resolve(skillRoot, skillName);
  if (path !== base && !path.startsWith(`${base}/`)) error(`${skillName} reference escapes Skill package: ${reference}`);
  try { await access(path); } catch { error(`${skillName} reference missing: ${reference}`); }
  const target = await realpath(path);
  if (!target.startsWith(`${await realpath(base)}/`)) error(`${skillName} reference symlink escapes Skill package: ${reference}`);
}

/** Validate that every Skill invocation closes over the supplied live Tool/action catalog. */
export async function validateSkillClosure({ root, mapping, catalog, skillDirectory = "shared/skills", forbiddenHostText = DEFAULT_FORBIDDEN_HOST_TEXT }) {
  const base = resolve(root);
  const map = mapping ?? (await import("yaml")).parse(await readFile(join(base, "contracts/skill-tool-map.yaml"), "utf8"));
  const liveCatalog = catalog ?? JSON.parse(await readFile(join(base, "contracts/mcp-tool-catalog.json"), "utf8"));
  const toolMap = asCatalogMap(liveCatalog);
  const skillRoot = join(base, skillDirectory);
  const directories = (await readdir(skillRoot, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  const entries = map.skills ?? [];
  if (JSON.stringify(directories) !== JSON.stringify(entries.map((entry) => entry.skill).sort())) error("Skill directories and skill-tool-map entries differ");
  for (const entry of entries) {
    const callable = [...(entry.tools?.required ?? []), ...(entry.tools?.optional ?? [])];
    for (const name of callable) {
      if (!toolMap.has(name)) error(`${entry.skill} declares unknown Tool ${name}`);
      if ((entry.tools?.forbidden ?? []).includes(name)) error(`${entry.skill} declares forbidden Tool ${name} callable`);
    }
    for (const name of entry.requires ?? []) if (!directories.includes(name)) error(`${entry.skill} requires missing Skill ${name}`);
    const skillPath = join(skillRoot, entry.skill);
    const listed = new Set(entry.references ?? []);
    const files = ["SKILL.md", ...listed];
    const walk = async (directory, prefix = "") => {
      for (const item of await readdir(directory, { withFileTypes: true })) {
        const path = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.isDirectory()) files.push(...await walk(join(directory, item.name), path));
        else if (item.name.endsWith(".md") && path !== "SKILL.md" && !listed.has(path)) files.push(path);
      }
      return [];
    };
    await walk(skillPath);
    for (const reference of files.slice(1)) await ensureContainedReference(skillRoot, entry.skill, reference);
    const texts = await Promise.all(files.map((file) => readFile(join(skillPath, file), "utf8")));
    const allText = texts.join("\n");
    const lower = allText.toLowerCase();
    for (const value of forbiddenHostText) if (lower.includes(value)) error(`${entry.skill} contains host-specific or sensitive text: ${value}`);
    for (const invocation of invocations(allText)) checkInvocation(entry, toolMap, invocation);
    for (const [tool, actions] of Object.entries(entry.actions ?? {})) {
      if (!toolMap.has(tool)) error(`${entry.skill} action map references unknown Tool ${tool}`);
      for (const action of actions) if (!toolMap.get(tool).has(action)) error(`${entry.skill} action map references unknown ${tool}.${action}`);
    }
  }
  return { skills: entries.length, tools: toolMap.size };
}

