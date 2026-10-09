import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8")) as Record<string, any>;

describe("Codex marketplace package", () => {
  it("publishes the AIXCut Codex package from the codex directory", () => {
    const marketplace = readJson(".agents/plugins/marketplace.json");
    const [plugin] = marketplace.plugins;

    expect(marketplace.name).toBe("aixcut");
    expect(plugin).toMatchObject({
      name: "aixcut-codex-plugin",
      source: { source: "local", path: "./codex" },
      category: "Creativity",
    });
  });

  it("installs workflow skills without pinning a site-specific MCP endpoint", () => {
    const manifest = readJson("codex/.codex-plugin/plugin.json");

    expect(manifest.name).toBe("aixcut-codex-plugin");
    expect(manifest.skills).toBe("./skills/");
    expect(manifest).not.toHaveProperty("mcpServers");
    expect(manifest).not.toHaveProperty("interface.mcpServers");
  });

  it("does not advertise support or policy pages that have not been published", () => {
    const manifest = readJson("codex/.codex-plugin/plugin.json");
    expect(manifest.interface).not.toHaveProperty("supportURL");
    expect(manifest.interface).not.toHaveProperty("privacyPolicyURL");
    expect(manifest.interface).not.toHaveProperty("termsOfServiceURL");
  });

  it("does not send users to a fixed regional website", () => {
    const manifest = readJson("codex/.codex-plugin/plugin.json");

    expect(manifest.author).not.toHaveProperty("url");
    expect(manifest).not.toHaveProperty("homepage");
    expect(manifest.interface).not.toHaveProperty("websiteURL");
  });

  it("passes the connected MCP site origin to the local media bridge", () => {
    const skill = readFileSync(
      resolve(root, "shared/skills/aixcut-timeline-editing/SKILL.md"),
      "utf8",
    );

    expect(skill).toContain("--allowed-origin");
    expect(skill).toContain("MCP Server instructions");
    expect(skill).toContain("prompt_add_material");
  });
});
