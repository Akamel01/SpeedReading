// scripts/harness-run.mjs — zero-dependency CDP runner for test/harness/*.html pages.
// Usage: node scripts/harness-run.mjs <page-path> [--assert] [--shot out.png] [--viewport WxH]
// The page must set `window.__HARNESS__ = { ok:boolean, checks:[{name, ok, detail}] }`.
// Exits 1 when --assert is given and any check fails (or the page errors).
// Final owner: M-P08A.

import { createServer } from 'node:http';
import { readFile, mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const REPO = resolve(new URL('..', import.meta.url).pathname);
const PORT = 8188;
const DEBUG_PORT = 9345;

const args = process.argv.slice(2);
const pageArg = args.find((a) => !a.startsWith('--'));
const wantAssert = args.includes('--assert');
const shotIndex = args.indexOf('--shot');
const viewportIndex = args.indexOf('--viewport');
const viewport = viewportIndex >= 0 ? args[viewportIndex + 1] : null;
const shotPath = shotIndex >= 0 ? args[shotIndex + 1] : null;

if (!pageArg) {
  console.error('usage: node scripts/harness-run.mjs <test/harness/page.html> [--assert] [--shot out.png] [--viewport WxH]');
  process.exit(2);
}

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium`,
].filter(Boolean);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
      const filePath = join(REPO, decodeURIComponent(url.pathname));
      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((ok) => server.listen(PORT, '127.0.0.1', () => ok(server)));
}

function startChrome(userDataDir) {
  const bin = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!bin) throw new Error('no Chrome binary found (set CHROME_PATH)');
  return spawn(bin, [
    '--headless', '--disable-gpu', '--no-sandbox', '--no-first-run',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${userDataDir}`, 'about:blank',
  ], { stdio: 'ignore' });
}

async function connectCdp() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        const ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
        let id = 0;
        const pending = new Map();
        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.id && pending.has(msg.id)) {
            const { resolve: res, reject } = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) reject(new Error(msg.error.message));
            else res(msg.result);
          }
        };
        const send = (method, params = {}) => new Promise((res, rej) => {
          const msgId = ++id;
          pending.set(msgId, { resolve: res, reject: rej });
          ws.send(JSON.stringify({ id: msgId, method, params }));
        });
        return { ws, send };
      }
    } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('CDP connection failed');
}

async function main() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'harness-'));
  const server = await startServer();
  const chrome = startChrome(userDataDir);
  let failures = 0;
  try {
    const { send } = await connectCdp();
    await send('Page.enable');
    await send('Runtime.enable');
    if (viewport && /^\d+x\d+$/.test(viewport)) {
      const [width, height] = viewport.split('x').map(Number);
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    }
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${pageArg.replace(/^\//, '')}` });

    let result = null;
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const evalResult = await send('Runtime.evaluate', { expression: 'window.__HARNESS__ ?? null', returnByValue: true });
      if (evalResult.result && evalResult.result.value) { result = evalResult.result.value; break; }
      await new Promise((r) => setTimeout(r, 200));
    }

    if (!result) {
      console.log('FAIL  harness did not produce window.__HARNESS__ within 20s');
      failures += 1;
    } else {
      for (const check of result.checks ?? []) {
        const ok = check.ok === true;
        if (!ok) failures += 1;
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.name}${check.detail ? ` — ${check.detail}` : ''}`);
      }
    }

    if (shotPath) {
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(shotPath, Buffer.from(shot.data, 'base64'));
      console.log(`screenshot: ${shotPath}`);
    }
  } finally {
    chrome.kill();
    server.close();
  }

  const verdict = failures === 0 ? 'PASS' : 'FAIL';
  console.log(`${verdict}  ${pageArg} (${failures} failures)`);
  process.exit(wantAssert && failures > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error(`harness runner error: ${error.message}`);
  process.exit(1);
});
