import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Codex adapter for the unified browser handoff', () => {
  it('maps the complete shared URL to the Codex browser target locally', () => {
    const skill = readFileSync('shared/skills/aixcut-projects/SKILL.md', 'utf8');
    expect(skill).toContain('result.browser_handoff.url');
    expect(skill).toContain('target: { type: "browser", url: result.browser_handoff.url }');
    expect(skill).toContain('placement: "right"');
    expect(skill).toContain('page_status');
    expect(skill).toContain('session_token');
  });
  it('does not refer to the removed MCP result field', () => {
    for (const skill of ['aixcut-projects', 'aixcut-known-errors']) {
      expect(readFileSync(`shared/skills/${skill}/SKILL.md`, 'utf8')).not.toContain('open_in_codex');
    }
  });

  it('requires handoff before page_status and never treats queued as connected', () => {
    const projects = readFileSync('shared/skills/aixcut-projects/SKILL.md', 'utf8');
    const errors = readFileSync('shared/skills/aixcut-known-errors/SKILL.md', 'utf8');
    for (const skill of [projects, errors]) {
      expect(skill).toMatch(/handoff|交接/i);
      expect(skill).toContain('queued');
      expect(skill).toMatch(/page_status/);
      expect(skill).toMatch(/target Project|目标.*Project|requested_project_id|目标项目/i);
    }
  });
});
