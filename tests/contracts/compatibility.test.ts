import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8")) as Record<
    string,
    any
  >;

describe("Plugin compatibility metadata", () => {
  it("matches the plugin manifest and the bundled MCP Tool Catalog", () => {
    const plugin = readJson("codex/.codex-plugin/plugin.json");
    const packageMetadata = readJson("package.json");
    const packageLock = readJson("package-lock.json");
    const compatibility = readJson("contracts/compatibility.json");
    const catalog = readJson("contracts/mcp-tool-catalog.json");

    expect(compatibility.plugin_version).toBe(plugin.version);
    expect(packageMetadata.version).toBe(plugin.version);
    expect(packageLock.version).toBe(plugin.version);
    expect(packageLock.packages[""]).toMatchObject({ version: plugin.version });
    expect(compatibility.server_contract.min).toBe(
      catalog.server_contract_version,
    );
    expect(compatibility.server_contract.max).toBe(
      catalog.server_contract_version,
    );
    expect(compatibility.helper_schema_version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
