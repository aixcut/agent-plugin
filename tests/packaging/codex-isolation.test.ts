import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Codex repository isolation', () => {
  it('keeps build and validation free of WorkBuddy dispatch', () => {
    for (const script of ['scripts/build.mjs', 'scripts/validate.mjs']) {
      expect(readFileSync(script, 'utf8')).not.toMatch(/workbuddy|adaptWorkBuddy/i);
      const result = spawnSync(process.execPath, [script, '--host', 'workbuddy'], { encoding: 'utf8' });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('Codex');
    }
  });
  it('has no WorkBuddy source or packaging entry point', () => {
    for (const path of ['hosts/workbuddy', 'contracts/site-profiles.json', 'scripts/package-workbuddy.mjs', 'tests/packaging/workbuddy.test.ts']) expect(existsSync(path), path).toBe(false);
  });
});
