import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const packages = [
  {
    name: 'codex',
    plugin: 'codex/.codex-plugin/plugin.json',
    compatibility: 'codex/contracts/compatibility.json',
    release: 'codex/release-manifest.json',
    basics: 'codex/skills/aixcut-basics/SKILL.md',
    maintenance: 'codex/skills/aixcut-basics/references/plugin-maintenance.md',
    mcp: 'codex/.mcp.json',
    endpoint: null,
  },
  {
    name: 'openai',
    plugin: 'openai/plugin.json',
    compatibility: 'openai/contracts/compatibility.json',
    release: null,
    basics: 'openai/skills/aixcut-basics/SKILL.md',
    maintenance: 'openai/skills/aixcut-basics/references/plugin-maintenance.md',
    mcp: 'openai/mcp.json',
    endpoint: null,
  },
];

const read = (relativePath) => readFile(join(root, relativePath), 'utf8');
const json = async (relativePath) => JSON.parse(await read(relativePath));

for (const pkg of packages) {
  test(`${pkg.name} package wires the maintenance reference and preserves its endpoint`, async () => {
    const basics = await read(pkg.basics);
    const maintenance = await read(pkg.maintenance);
    const mcp = await read(pkg.mcp);
    const plugin = await json(pkg.plugin);
    const expectedEndpoint = pkg.name === 'codex' || plugin.repository.includes('gitee.com')
      ? 'https://web.aixcut.cn/mcp'
      : 'https://web.aixcut.com/mcp';

    assert.match(basics, /plugin-maintenance\.md/);
    for (const phrase of [
      'marketplace list',
      'marketplace upgrade',
      'plugin list --available --json',
      'sourceType',
      '用户确认',
      '新建.*任务',
    ]) {
      assert.match(maintenance, new RegExp(phrase));
    }
    assert.doesNotMatch(maintenance, /marketplace list --json/);
    assert.match(maintenance, /aixcut\/agent-plugin/);
    assert.match(maintenance, /github\.com\/aixcut\/agent-plugin.*\.git/);
    assert.match(maintenance, /gitee\.com\/aixcut\/agent-plugin/);
    assert.match(maintenance, /不要.*删除|不要.*覆盖|不得.*删除|不得.*覆盖/);
    assert.match(mcp, new RegExp(expectedEndpoint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.equal(plugin.repository, 'https://github.com/aixcut/agent-plugin');
    if (pkg.name === 'codex') {
      assert.equal(plugin.homepage, 'https://aixcut.cn');
    } else {
      assert.equal(plugin.homepage, 'https://aixcut.com');
    }
  });

  test(`${pkg.name} package metadata is versioned with the maintenance behavior`, async () => {
    const plugin = await json(pkg.plugin);
    const compatibility = await json(pkg.compatibility);
    assert.equal(plugin.version, '0.3.2');
    assert.equal(compatibility.plugin_version, plugin.version);
    if (pkg.release) {
      const release = await json(pkg.release);
      assert.equal(release.plugin.version, plugin.version);
      assert.ok(release.files.some(({ path }) => path.endsWith('/plugin-maintenance.md')));
    }
  });
}

test('maintenance rules keep region-specific marketplace sources explicit', async () => {
  const maintenance = await read('codex/skills/aixcut-basics/references/plugin-maintenance.md');
  assert.match(maintenance, /GitHub.*国际|国际.*GitHub/i);
  assert.match(maintenance, /Gitee.*国内|国内.*Gitee/i);
  assert.match(maintenance, /regional MCP configuration/i);
});
