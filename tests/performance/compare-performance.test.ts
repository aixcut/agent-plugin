import { describe, expect, it } from "vitest";
import { comparePerformance } from "../../scripts/compare-performance.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const trace = (scenario: string, phases: Array<Record<string, number>>) => ({
  scenario,
  phases: phases.map((phase, index) => ({ name: `phase-${index + 1}`, ...phase })),
});

describe("performance trace comparison", () => {
  it("requires a named phase and explicit metrics instead of silently inventing zeroes", () => {
    const valid = trace("a", [{ duration_ms: 1, mcp_calls: 0, wait_ms: 0, failures: 0, retries: 0 }]);
    expect(() => comparePerformance({ scenario: "a", phases: [{ ...valid.phases[0], name: "" }] }, valid)).toThrow(/name/);
    expect(() => comparePerformance(trace("a", [{ duration_ms: 1 }]), valid)).toThrow(/mcp_calls/);
  });

  it("supports caller-supplied traces through the npm command and Markdown CLI", () => {
    const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
    expect(pkg.scripts["performance:compare"]).toBe("node scripts/compare-performance.mjs");
    const output = execFileSync(process.execPath, ["scripts/compare-performance.mjs", "tests/performance/fixtures/short-edit.baseline.json", "tests/performance/fixtures/short-edit.optimized.json", "--markdown"], { encoding: "utf8" });
    expect(output).toContain("| total_ms | 1800 | 1300 | -500 |");
    expect(() => execFileSync(process.execPath, ["scripts/compare-performance.mjs"], { stdio: "pipe" })).toThrow();
  });
  it("aggregates elapsed, MCP calls, waits, failures and retries", () => {
    expect(
      comparePerformance(
        trace("short-edit", [
          { duration_ms: 1000, mcp_calls: 4, wait_ms: 300, failures: 1, retries: 1 },
          { duration_ms: 800, mcp_calls: 3, wait_ms: 200, failures: 0, retries: 0 },
        ]),
        trace("short-edit", [
          { duration_ms: 700, mcp_calls: 2, wait_ms: 100, failures: 0, retries: 0 },
          { duration_ms: 600, mcp_calls: 2, wait_ms: 100, failures: 0, retries: 0 },
        ]),
      ),
    ).toEqual({
      scenario: "short-edit",
      baseline: { total_ms: 1800, mcp_calls: 7, wait_ms: 500, failures: 1, retries: 1 },
      optimized: { total_ms: 1300, mcp_calls: 4, wait_ms: 200, failures: 0, retries: 0 },
      delta: { total_ms: -500, mcp_calls: -3, wait_ms: -300, failures: -1, retries: -1 },
      improved: true,
    });
  });

  it("rejects invalid or mismatched traces", () => {
    const metrics = { mcp_calls: 0, wait_ms: 0, failures: 0, retries: 0 };
    expect(() => comparePerformance(trace("a", [{ ...metrics, duration_ms: -1 }]), trace("a", [{ ...metrics, duration_ms: 1 }]))).toThrow(/duration_ms/);
    expect(() => comparePerformance(trace("a", [{ ...metrics, duration_ms: 1 }]), trace("b", [{ ...metrics, duration_ms: 1 }]))).toThrow(/scenario/);
  });
});
