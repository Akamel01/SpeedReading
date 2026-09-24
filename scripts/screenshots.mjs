// scripts/screenshots.mjs — 6 surfaces x 390/1280 for human review (binding 8).
// Usage: node scripts/screenshots.mjs (exit 0 = all captured).
// Surfaces: library, player, dashboard-log (real app, seeded state) +
// components, gamify, dashboard-perf (harness pages). Output:
// .autoforge/validation/screenshots/<surface>-<390|1280>.png
// Zero dependencies. Owner: M-P08A.

import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const REPO = resolve(new URL('../', import.meta.url).pathname);
const PORT = 8187;
const DEBUG_PORT = 9340;
const OUT = join(REPO, '.autoforge', 'validation', 'screenshots');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const CALIBRATION = 'Calibration sentences for the screenshot run. '.repeat(30);

async function main() {
  await mkdir(OUT, { recursive: true });
  const userDataDir = await mkdtemp(join(tmpdir(), 'shots-'));
  const server = createServer(async (req, res) => {
    try {
      const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const fp = resolve(join(REPO, p === '/' ? 'index.html' : p));
      if (!fp.startsWith(REPO)) return void res.writeHead(403).end();
      const body = await readFile(fp);
      res.writeHead(200, { 'content-type': MIME[extname(fp)] ?? 'application/octet-stream' });
      res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((r) => server.listen(PORT, '127.0.0.1', r));
  const chromePath = process.env.CHROME_PATH;
  const chrome = spawn(chromePath, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run',
    `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${userDataDir}`, 'about:blank'], { stdio: 'ignore' });

  const version = await (async () => {
    const end = Date.now() + 10000;
    while (Date.now() < end) {
      try { return await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json()); }
      catch { await new Promise((r) => setTimeout(r, 200)); }
    }
    throw new Error('CDP connect failed');
  })();
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
  };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const sid = (await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true })).result.sessionId;
  await send('Page.enable', {}, sid);
  await send('Runtime.enable', {}, sid);
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sid);
    if (r.result.exceptionDetails) throw new Error('page exception');
    return r.result.result.value;
  };
  const waitFor = async (expression, timeoutMs = 15000) => {
    const end = Date.now() + timeoutMs;
    while (Date.now() < end) {
      try { if (await evaluate(expression)) return; } catch { /* reloading */ }
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`timeout: ${expression.slice(0, 80)}`);
  };
  const shot = async (name, width, height) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sid);
    await new Promise((r) => setTimeout(r, 400));
    const data = (await send('Page.captureScreenshot', { format: 'png' }, sid)).result.data;
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(OUT, `${name}-${width}.png`), Buffer.from(data, 'base64'));
    console.log(`screenshot: ${name}-${width}.png`);
    await send('Emulation.clearDeviceMetricsOverride', {}, sid).catch(() => {});
  };

  try {
    // Real app surfaces with seeded state.
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, sid);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);
    await evaluate(`(() => {
      const file = new File([${JSON.stringify(CALIBRATION)}], 'shots.txt', { type: 'text/plain' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-library input[type="file"]');
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 1`);
    await shot('library', 390, 700);
    await shot('library', 1280, 800);

    await evaluate(`document.querySelector('#view-library .library-item button[data-action="open"]').click()`);
    await waitFor(`!document.querySelector('#view-player').hidden`);
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Pause'`);
    await new Promise((r) => setTimeout(r, 1500)); // let chunks emit so the stage shows text
    await evaluate(`document.querySelector('.player-btn-play').click()`);
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Play'`);
    await shot('player', 390, 700);
    await shot('player', 1280, 800);

    await evaluate(`(async () => {
      const store = await (await import('/src/lib/store.js')).openStore();
      const now = Date.now();
      for (let i = 0; i < 6; i++) {
        await store.put('sessions', { id: 'shot' + i, kind: i === 0 ? 'baseline' : 'read', textId: 'x',
          chapterIndex: 0, chunkSize: 2, targetWpm: 300, startedAt: now - (6 - i) * 86400000,
          endedAt: now - (6 - i) * 86400000 + 120000, wordCount: 400 + i * 50, elapsedMs: 120000,
          wpm: 200 + i * 10, quizId: null, correct: null, total: null,
          comprehensionPct: i % 2 === 0 ? 80 : null });
      }
      return true;
    })()`);
    await evaluate(`[...document.querySelectorAll('header nav button')].find(b => b.textContent.trim() === 'Dashboard').click()`);
    await waitFor(`document.querySelector('#view-dashboard .dashboard-table') !== null`);
    await shot('dashboard-log', 390, 700);
    await shot('dashboard-log', 1280, 800);

    // Harness pages.
    for (const page of ['test/harness/components.html', 'test/harness/gamify.html', 'test/harness/dashboard-perf.html']) {
      const name = page.split('/').pop().replace('.html', '');
      await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/${page}` }, sid);
      await new Promise((r) => setTimeout(r, 1500));
      await shot(name, 390, 700);
      await shot(name, 1280, 800);
    }
    console.log('\n12 screenshots captured in .autoforge/validation/screenshots/');
  } catch (error) {
    console.error(`screenshots crashed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    ws.close();
    chrome.kill();
    server.close();
  }
}

main().catch((e) => { console.error(`screenshots crashed: ${e.message}`); process.exit(2); });
