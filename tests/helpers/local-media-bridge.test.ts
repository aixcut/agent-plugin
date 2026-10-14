import { afterAll, describe, expect, it } from 'vitest';
import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const scriptPath = fileURLToPath(
  new URL('../../vendor/plugin-core/helpers/local-media-bridge.mjs', import.meta.url),
);

interface BridgeModule {
  parseBridgeArguments: (argv: string[]) => {
    mode: string;
    files: string[];
    port: number;
    ttlMs: number;
    stateFile: string | null;
    reuse: boolean;
    foreground: boolean;
  };
  resolveBridgeReuse: (
    state: unknown,
    filePaths: string[],
    now?: number,
    allowedOrigin?: string | null,
  ) => { reusable: boolean; reason?: string; files?: unknown[] };
  readBridgeState: (stateFile: string) => Record<string, unknown> | null;
  writeBridgeState: (stateFile: string, state: Record<string, unknown>) => void;
  clearBridgeState: (stateFile: string) => void;
  retireExpiredBridge: (
    server: { close: () => void; closeIdleConnections?: () => void },
    stateFile: string,
    pid?: number,
  ) => void;
}

const bridge = (await import(scriptPath)) as unknown as BridgeModule;

const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'aixcut-bridge-'));
const stateFile = path.join(workspace, 'state.json');
const mediaFile = path.join(workspace, 'clip.mp4');
fs.writeFileSync(mediaFile, 'bridge-bytes');

const cli = async (args: string[]): Promise<Record<string, unknown>> => {
  const { stdout } = await run(process.execPath, [scriptPath, ...args], {
    cwd: workspace,
  });
  return JSON.parse(stdout) as Record<string, unknown>;
};

/** 用 signal 0 探活，不真的给进程发信号。 */
const processIsAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

const readBridgeStateOf = (stateFilePath: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(fs.readFileSync(stateFilePath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
};

afterAll(() => {
  try {
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) as { pid?: number };
      if (typeof state.pid === 'number') process.kill(state.pid, 'SIGKILL');
    }
  } catch {
    // 集成用例已经停过桥，这里只兜底。
  }
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe('桥的参数解析', () => {
  it('默认自动选端口、自己后台化、2 小时有效期', () => {
    expect(bridge.parseBridgeArguments(['/tmp/a.mp4', '/tmp/b.mov'])).toMatchObject({
      mode: 'serve',
      files: ['/tmp/a.mp4', '/tmp/b.mov'],
      port: 0,
      ttlMs: 7_200_000,
      reuse: true,
      foreground: false,
    });
  });

  it('认 status 和 stop 两个只读模式', () => {
    expect(bridge.parseBridgeArguments(['--status']).mode).toBe('status');
    expect(bridge.parseBridgeArguments(['--stop']).mode).toBe('stop');
  });

  it('端口取值和未知选项都要拦下来', () => {
    expect(bridge.parseBridgeArguments(['--port', '8899', 'a.mp4']).port).toBe(8899);
    expect(() => bridge.parseBridgeArguments(['--port', 'abc', 'a.mp4'])).toThrow(/port/);
    expect(() => bridge.parseBridgeArguments(['--ttl-ms'])).toThrow(/ttl-ms/);
    expect(() => bridge.parseBridgeArguments(['--nope'])).toThrow(/unknown option/);
  });

  it('接收精确 HTTPS 官网来源并拒绝带路径的 URL', () => {
    expect(
      bridge.parseBridgeArguments([
        '--allowed-origin',
        'https://studio.customer.example',
        '/tmp/a.mp4',
      ]),
    ).toMatchObject({ allowedOrigin: 'https://studio.customer.example' });
    expect(() =>
      bridge.parseBridgeArguments([
        '--allowed-origin',
        'https://studio.customer.example/studio',
        '/tmp/a.mp4',
      ]),
    ).toThrow(/allowed-origin/);
    expect(() =>
      bridge.parseBridgeArguments([
        '--allowed-origin',
        'http://studio.customer.example',
        '/tmp/a.mp4',
      ]),
    ).toThrow(/allowed-origin/);
  });
});

describe('是否复用已在跑的桥', () => {
  const state = (overrides: Record<string, unknown> = {}) => ({
    base_url: 'http://127.0.0.1:1234',
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    files: [{ path: '/tmp/a.mp4', name: 'a.mp4', url: 'http://127.0.0.1:1234/media/aa?token=t' }],
    ...overrides,
  });

  it('覆盖了这次的文件且没过期就复用', () => {
    const decision = bridge.resolveBridgeReuse(state(), ['/tmp/a.mp4']);
    expect(decision.reusable).toBe(true);
    expect(decision.files).toHaveLength(1);
  });

  it('少一个文件就得起新桥，并说清缺哪个', () => {
    expect(bridge.resolveBridgeReuse(state(), ['/tmp/a.mp4', '/tmp/b.mp4'])).toMatchObject({
      reusable: false,
      reason: 'missing-files',
      missing: ['/tmp/b.mp4'],
    });
  });

  it('过期的桥不能复用', () => {
    const expired = state({ expires_at: new Date(Date.now() - 1_000).toISOString() });
    expect(bridge.resolveBridgeReuse(expired, ['/tmp/a.mp4'])).toMatchObject({
      reusable: false,
      reason: 'expired',
    });
  });

  it('没有状态文件时不复用', () => {
    expect(bridge.resolveBridgeReuse(null, ['/tmp/a.mp4'])).toMatchObject({
      reusable: false,
      reason: 'no-state',
    });
  });

  it('站点来源不同就不复用旧桥', () => {
    expect(
      bridge.resolveBridgeReuse(
        state({ allowed_origin: 'https://a.example' }),
        ['/tmp/a.mp4'],
        Date.now(),
        'https://b.example',
      ),
    ).toMatchObject({ reusable: false, reason: 'origin-mismatch' });
  });
});

describe('状态文件读写', () => {
  it('坏掉的 JSON 当成没有状态，不让桥起不来', () => {
    const broken = path.join(workspace, 'broken.json');
    fs.writeFileSync(broken, '{ not json');
    expect(bridge.readBridgeState(broken)).toBeNull();
    expect(() => bridge.clearBridgeState(broken)).not.toThrow();
    expect(fs.existsSync(broken)).toBe(false);
  });

  it('写入会建目录，清理由缺失也不报错', () => {
    const nested = path.join(workspace, 'nested', 'state.json');
    bridge.writeBridgeState(nested, { pid: 1 });
    expect(bridge.readBridgeState(nested)).toEqual({ pid: 1 });
    bridge.clearBridgeState(nested);
    expect(bridge.readBridgeState(nested)).toBeNull();
    expect(() => bridge.clearBridgeState(nested)).not.toThrow();
  });
});

describe('真起一个桥', () => {
  it(
    '起桥、取文件、复用、查状态、停桥',
    async () => {
      const allowedOrigin = 'https://studio.customer.example';
      const first = await cli([
        mediaFile,
        '--state-file',
        stateFile,
        '--allowed-origin',
        allowedOrigin,
      ]);
      expect(first.reused).toBe(false);
      expect(String(first.base_url)).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
      expect(fs.existsSync(`${stateFile}.log`)).toBe(true);

      const files = first.files as { url: string; name: string; path: string }[];
      expect(files).toHaveLength(1);
      expect(files[0]).toMatchObject({ name: 'clip.mp4', path: mediaFile });
      const bridgeToken = new URL(files[0]!.url).searchParams.get('token');

      // 页面就是拿这个 url 取文件，内容必须一模一样。
      const downloaded = await fetch(files[0]!.url, { headers: { Origin: 'http://localhost:8888' } });
      expect(downloaded.status).toBe(200);
      expect(await downloaded.text()).toBe('bridge-bytes');
      expect(downloaded.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8888');
      expect(fs.readFileSync(`${stateFile}.log`, 'utf8')).not.toContain(bridgeToken);

      const configuredOrigin = await fetch(files[0]!.url, {
        headers: { Origin: allowedOrigin },
      });
      expect(configuredOrigin.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
      const preflight = await fetch(files[0]!.url, {
        method: 'OPTIONS',
        headers: {
          Origin: allowedOrigin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Private-Network': 'true',
        },
      });
      expect(preflight.status).toBe(204);
      expect(preflight.headers.get('Access-Control-Allow-Origin')).toBe(allowedOrigin);
      expect(preflight.headers.get('Access-Control-Allow-Private-Network')).toBe('true');

      for (const origin of [
        'https://aixcut.cn',
        'https://aixcut.com',
        'https://www.goxutech.com',
      ]) {
        const response = await fetch(files[0]!.url, { headers: { Origin: origin } });
        expect(response.status).toBe(200);
        expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      }

      const untrustedOrigin = await fetch(files[0]!.url, {
        headers: { Origin: 'https://untrusted.example' },
      });
      expect(untrustedOrigin.status).toBe(200);
      expect(untrustedOrigin.headers.get('Access-Control-Allow-Origin')).toBeNull();

      // 第二次请求同一份文件：复用同一个桥，端口不变。
      const second = await cli([
        mediaFile,
        '--state-file',
        stateFile,
        '--allowed-origin',
        allowedOrigin,
      ]);
      expect(second.reused).toBe(true);
      expect(second.base_url).toBe(first.base_url);

      const status = await cli(['--status', '--state-file', stateFile]);
      expect(status.running).toBe(true);
      expect(status.base_url).toBe(first.base_url);

      const stopped = await cli(['--stop', '--state-file', stateFile]);
      expect(stopped.stopped).toBe(true);
      expect(fs.existsSync(stateFile)).toBe(false);
      await expect(
        fetch(files[0]!.url, { signal: AbortSignal.timeout(1_000) }),
      ).rejects.toThrow();
    },
    30_000,
  );

  it(
    '状态文件所在目录还不存在时，自己建目录把桥起起来',
    async () => {
      const nestedStateFile = path.join(workspace, 'fresh-home', '.aixcut', 'bridge.json');
      const started = await cli([mediaFile, '--state-file', nestedStateFile]);

      expect(started.reused).toBe(false);
      expect(fs.existsSync(nestedStateFile)).toBe(true);
      const files = started.files as { url: string; name: string }[];
      expect(files[0]!.name).toBe('clip.mp4');

      const downloaded = await fetch(files[0]!.url, {
        headers: { Origin: 'http://localhost:8888' },
      });
      expect(await downloaded.text()).toBe('bridge-bytes');

      await cli(['--stop', '--state-file', nestedStateFile]);
    },
    30_000,
  );

  it(
    '切换官网时重启桥且不延续旧官网的文件授权',
    async () => {
      const siteStateFile = path.join(workspace, 'site-state.json');
      const first = await cli([
        mediaFile,
        '--state-file',
        siteStateFile,
        '--allowed-origin',
        'https://a.example',
      ]);
      const firstUrl = (first.files as { url: string }[])[0]!.url;
      const second = await cli([
        mediaFile,
        '--state-file',
        siteStateFile,
        '--allowed-origin',
        'https://b.example',
      ]);

      expect(second.reused).toBe(false);
      expect(readBridgeStateOf(siteStateFile)?.['allowed_origin']).toBe('https://b.example');
      expect((second.files as { url: string }[])[0]!.url).not.toBe(firstUrl);
      await cli(['--stop', '--state-file', siteStateFile]);
    },
    30_000,
  );

  it.each([
    ['切换官网', 'https://new.example'],
    ['停止桥', undefined],
  ])('%s时不会结束 PID 已被复用的其他进程', async (operation, nextOrigin) => {
    const statePath = path.join(workspace, `stale-${operation}.json`);
    const unrelated = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    await new Promise<void>((resolve, reject) => {
      unrelated.once('spawn', resolve);
      unrelated.once('error', reject);
    });
    const pid = unrelated.pid;
    expect(pid).toBeTypeOf('number');
    bridge.writeBridgeState(statePath, {
      base_url: 'http://127.0.0.1:1', token: 'stale-token', pid,
      allowed_origin: 'https://old.example',
      expires_at: new Date(Date.now() + 60_000).toISOString(), files: [],
    });

    try {
      const result = operation === '停止桥'
        ? await cli(['--stop', '--state-file', statePath])
        : await cli([mediaFile, '--state-file', statePath, '--allowed-origin', nextOrigin!]);
      expect(processIsAlive(pid!)).toBe(true);
      if (operation === '停止桥') expect(result).toMatchObject({ stopped: false, reason: 'bridge-not-verified' });
      else await cli(['--stop', '--state-file', statePath]);
    } finally {
      unrelated.kill('SIGKILL');
    }
  }, 30_000);

  it(
    '到期后自己退场，不留孤儿进程占着端口',
    async () => {
      const expiringStateFile = path.join(workspace, 'expiring.json');
      const started = await cli([
        mediaFile,
        '--state-file',
        expiringStateFile,
        '--ttl-ms',
        '1500',
      ]);
      const pid = Number((bridge.readBridgeState(expiringStateFile) ?? {})['pid']);
      expect(Number.isInteger(pid)).toBe(true);
      expect(processIsAlive(pid)).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 4_000));

      expect(processIsAlive(pid)).toBe(false);
      expect(fs.existsSync(expiringStateFile)).toBe(false);
    },
    30_000,
  );

  it(
    '到期收尾时状态文件已经属于新桥，就不要删掉它',
    () => {
      const sharedStateFile = path.join(workspace, 'shared.json');
      const previousPid = process.pid;
      bridge.writeBridgeState(sharedStateFile, {
        base_url: 'http://127.0.0.1:1',
        token: 'new-bridge-token',
        pid: previousPid + 1,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        files: [],
      });

      let closed = false;
      bridge.retireExpiredBridge(
        { close: () => { closed = true; } },
        sharedStateFile,
        previousPid,
      );

      expect(closed).toBe(true);
      expect(readBridgeStateOf(sharedStateFile)?.['token']).toBe('new-bridge-token');
      fs.rmSync(sharedStateFile, { force: true });
    },
  );

  it(
    'token 不对时拒绝取文件，免得任何人拿到回环地址就能读盘',
    async () => {
      const started = await cli([mediaFile, '--state-file', stateFile]);
      const files = started.files as { url: string }[];
      const wrongToken = files[0]!.url.replace(/token=.*$/, 'token=wrong');
      expect((await fetch(wrongToken)).status).toBe(403);
      await cli(['--stop', '--state-file', stateFile]);
    },
    30_000,
  );
});
