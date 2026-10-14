#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const METRICS = ["total_ms", "mcp_calls", "wait_ms", "failures", "retries"];

const normalizeTrace = (trace, label) => {
  if (!trace || typeof trace !== "object" || Array.isArray(trace)) throw new Error(`${label} must be an object`);
  if (typeof trace.scenario !== "string" || !trace.scenario.trim()) throw new Error(`${label}.scenario is required`);
  if (!Array.isArray(trace.phases) || trace.phases.length === 0) throw new Error(`${label}.phases must be a non-empty array`);
  return {
    scenario: trace.scenario,
    phases: trace.phases.map((phase, index) => {
      if (!phase || typeof phase !== "object" || Array.isArray(phase)) throw new Error(`${label}.phases[${index}] must be an object`);
      if (typeof phase.name !== "string" || !phase.name.trim()) throw new Error(`${label}.phases[${index}].name is required`);
      const normalized = {};
      for (const metric of METRICS.slice(1)) {
        const value = phase[metric];
        if (!Number.isInteger(value) || value < 0) throw new Error(`${label}.phases[${index}].${metric} must be a non-negative integer`);
        normalized[metric] = value;
      }
      const duration = phase.duration_ms;
      if (!Number.isInteger(duration) || duration < 0) throw new Error(`${label}.phases[${index}].duration_ms must be a non-negative integer`);
      normalized.duration_ms = duration;
      return normalized;
    }),
  };
};

const aggregate = (trace, label) => {
  const normalized = normalizeTrace(trace, label);
  return {
    total_ms: normalized.phases.reduce((sum, phase) => sum + phase.duration_ms, 0),
    mcp_calls: normalized.phases.reduce((sum, phase) => sum + phase.mcp_calls, 0),
    wait_ms: normalized.phases.reduce((sum, phase) => sum + phase.wait_ms, 0),
    failures: normalized.phases.reduce((sum, phase) => sum + phase.failures, 0),
    retries: normalized.phases.reduce((sum, phase) => sum + phase.retries, 0),
  };
};

export const comparePerformance = (baselineTrace, optimizedTrace) => {
  const baseline = aggregate(baselineTrace, "baseline");
  const optimized = aggregate(optimizedTrace, "optimized");
  if (baselineTrace.scenario !== optimizedTrace.scenario) throw new Error("baseline and optimized scenario must match");
  const delta = Object.fromEntries(METRICS.map((metric) => [metric, optimized[metric] - baseline[metric]]));
  const improved = optimized.total_ms <= baseline.total_ms &&
    optimized.mcp_calls <= baseline.mcp_calls &&
    optimized.wait_ms <= baseline.wait_ms &&
    optimized.failures <= baseline.failures &&
    optimized.retries <= baseline.retries &&
    Object.values(delta).some((value) => value < 0);
  return { scenario: baselineTrace.scenario, baseline, optimized, delta, improved };
};

export const toMarkdown = (report) => [
  `## Performance comparison: ${report.scenario}`,
  "",
  "| Metric | Baseline | Optimized | Delta |",
  "|---|---:|---:|---:|",
  ...METRICS.map((metric) => `| ${metric} | ${report.baseline[metric]} | ${report.optimized[metric]} | ${report.delta[metric]} |`),
  "",
  `Result: ${report.improved ? "improved" : "not improved"}`,
  "",
].join("\n");

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const baselinePath = args[0];
  const optimizedPath = args[1];
  if (!baselinePath || !optimizedPath) throw new Error("Usage: node scripts/compare-performance.mjs <baseline.json> <optimized.json> [--markdown]");
  const report = comparePerformance(JSON.parse(await readFile(baselinePath, "utf8")), JSON.parse(await readFile(optimizedPath, "utf8")));
  process.stdout.write(args.includes("--markdown") ? toMarkdown(report) : `${JSON.stringify(report, null, 2)}\n`);
}
