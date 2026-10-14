#!/usr/bin/env node
import { access, cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flagValue = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
if (args.includes("--host") && flagValue("--host") !== "codex") throw new Error("This repository builds Codex only");
const root = resolve(flagValue("--root") ?? scriptRoot);
const output = resolve(root, flagValue("--out") ?? "codex");

const assertSourceNotOverwritten = (paths) => {
  for (const sourcePath of paths) {
    if (output === sourcePath || output.startsWith(`${sourcePath}/`)) {
      throw new Error(`Build output cannot overwrite package source: ${sourcePath}`);
    }
  }
};
const requireSource = async (path, label = path) => {
  try { await access(path); } catch { throw new Error(`Required package source is missing: ${label}: ${path}`); }
};
const copySkillTree = async ({ source, destination, includeAgents }) => {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "references" || (includeAgents && entry.name === "agents")) {
        await copySkillTree({ source: from, destination: join(destination, entry.name), includeAgents });
      }
      continue;
    }
    if (entry.name === "SKILL.md" ||
        (source.includes("/references") && entry.name.endsWith(".md")) ||
        (includeAgents && source.includes("/agents") && entry.name === "openai.yaml")) {
      await cp(from, join(destination, entry.name));
    }
  }
};
const buildCodex = async () => {
  const manifest = join(root, "codex/.codex-plugin/plugin.json");
  const skills = join(root, "shared/skills");
  const scripts = join(root, "shared/scripts");
  const assets = join(root, "shared/assets");
  const sources = [manifest, skills, scripts, assets].map((path) => resolve(path));
  assertSourceNotOverwritten(sources);
  for (const path of sources) await requireSource(path);

  if (output === resolve(root, "codex")) {
    for (const generated of ["skills", "scripts", "assets"]) await rm(join(output, generated), { recursive: true, force: true });
  } else await rm(output, { recursive: true, force: true });
  await mkdir(join(output, ".codex-plugin"), { recursive: true });
  if (manifest !== join(output, ".codex-plugin/plugin.json")) {
    await cp(manifest, join(output, ".codex-plugin/plugin.json"));
  }
  for (const skill of await readdir(skills, { withFileTypes: true })) {
    if (!skill.isDirectory()) continue;
    await copySkillTree({ source: join(skills, skill.name), destination: join(output, "skills", skill.name), includeAgents: true });
  }
  for (const helper of ["local-media-bridge.mjs", "download-capture-artifacts.mjs"]) await cp(join(scripts, helper), join(output, "scripts", helper));
  await cp(join(assets, "logo.svg"), join(output, "assets/logo.svg"));
  console.log(`Built Codex plugin package at ${output} (${(await readdir(skills)).length} skills).`);
};

await buildCodex();
