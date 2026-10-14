import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("cross-repository MCP contract", () => {
  it("matches the server contract version and tool snapshot", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/validate-cross-repo.mjs", "--server-root", "../aixcut-mcp-server"],
      { cwd: process.cwd(), encoding: "utf8" },
    );
    expect(result.status, result.stderr || result.stdout).toBe(0);
  });
});
