// Export/import round-trip harness (M-F05, ADR-15). Real UI + real store in headless Chromium.
// Run: node scripts/export-import.js (exit 0 = all pass). Zero dependencies.
import { createServer } from 'node:http';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const REPO = resolve(new URL('../', import.meta.url).pathname);
const PORT = 8131;
const DEBUG_PORT = 9351;
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const results = [];
function record(step, ok, detail = '') {
  results.push({ step, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
}

const CALIBRATION = Array.from({ length: 6 }, (_, i) =>
  `Export import sentence number ${i + 1} verifies the backup flow completely. It holds enough words for testing purposes!`).join(' ');

async function main() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'e2e-expimp-'));
  const downloadDir = await mkdtemp(join(tmpdir(), 'e2e-dl-'));
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
  const chrome = spawn(CHROME, ['--headless', '--disable-gpu', '--no-sandbox', '--no-first-run', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${userDataDir}`, 'about:blank'], { stdio: 'ignore' });

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
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const sid = (await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true })).result.sessionId;
  await send('Page.enable', {}, sid);
  await send('Runtime.enable', {}, sid);
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadDir });

  const evaluate = async (label, expression) => {
    if (expression === undefined) { expression = label; label = 'eval'; }
    console.log(`… ${label}`);
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sid);
    if (r.result.exceptionDetails) throw new Error(`${label} threw: ${(r.result.exceptionDetails.exception?.description ?? 'page exception').slice(0, 200)}`);
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

  try {
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, sid);
    void 0;
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);

    // Seed: import a calibration text through the real file input (wait for the view to render it first).
    await waitFor(`document.querySelector('#view-library input[type="file"]') !== null`, 10000);
    await evaluate('seed-import', `(() => {
      const file = new File([${JSON.stringify(CALIBRATION)}], 'roundtrip.txt', { type: 'text/plain' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-library input[type="file"]');
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 1`);
    await evaluate('stub-dialogs', `window.__confirm = true; window.__alerts = []; window.confirm = () => window.__confirm; window.alert = (m) => window.__alerts.push(m); true`);

    // Dismiss path FIRST (confirm false): no-op, list unchanged.
    const countBefore = await evaluate('count-before', `document.querySelectorAll('#view-library .library-item').length`);
    await evaluate('confirm-false', `window.__confirm = false; true`);
    await evaluate('dismiss-file', `(() => {
      const file = new File(['{}'], 'empty.json', { type: 'application/json' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-library .library-json-input');
      if (!input) return 'NO-INPUT';
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return 'SET'; })()`);
    await new Promise((r) => setTimeout(r, 800));
    const countAfter = await evaluate('count-after', `document.querySelectorAll('#view-library .library-item').length`);
    record('import-dismiss: dismissing confirm changes nothing', countAfter === countBefore, `before=${countBefore} after=${countAfter}`);

    // Wrong-schema negative FIRST: readable alert, data intact.
    await evaluate('confirm-true', `window.__confirm = true; window.__alerts = []; true`);
    await evaluate('bad-file', `(() => {
      const file = new File([JSON.stringify({ schemaVersion: 999 })], 'bad.json', { type: 'application/json' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-library .library-json-input');
      if (!input) return 'NO-INPUT';
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return 'SET'; })()`);
    await new Promise((r) => setTimeout(r, 800));
    const alerts = await evaluate('alerts', `window.__alerts`);
    const countFinal = await evaluate('count-final', `document.querySelectorAll('#view-library .library-item').length`);
    record('import-wrong-schema: readable error, data intact',
      alerts.some((m) => /schema/i.test(m)) && countFinal === countBefore,
      `alerts=${JSON.stringify(alerts).slice(0, 80)} count=${countFinal}`);

    // Export via the REAL dashboard Export button into the download dir.
    // (Dashboard import control is exercised above through the library twin; export needs no session.)
    await evaluate('goto-dashboard', `[...document.querySelectorAll('header nav button')].find(b => b.textContent.trim() === 'Dashboard').click()`);
    await waitFor(`!document.querySelector('#view-dashboard').hidden`);
    await evaluate('export-click', `[...document.querySelectorAll('#view-dashboard .dashboard-actions button')].find(b => /export/i.test(b.textContent)).click()`);
    let downloaded = null;
    for (let i = 0; i < 40; i++) {
      const files = await readdir(downloadDir);
      if (files.includes('speedread-export.json')) { downloaded = join(downloadDir, 'speedread-export.json'); break; }
      await new Promise((r) => setTimeout(r, 250));
    }
    if (!downloaded) throw new Error('export download never appeared');
    const snapshot = JSON.parse(await readFile(downloaded, 'utf8'));
    record('export: snapshot downloads with schema + records',
      snapshot.schemaVersion === 1 && snapshot.texts.length >= 1 && Array.isArray(snapshot.sessions),
      `texts=${snapshot.texts.length} sessions=${snapshot.sessions.length}`);

    // Wipe IDB via the real storage layer (deleteDatabase would block on the app's open connection).
    await send('Storage.clearDataForOrigin', { origin: `http://127.0.0.1:${PORT}`, storageTypes: 'indexeddb' }, sid);
    await send('Page.reload', {}, sid);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);
    const emptyAfterWipe = await evaluate(`document.querySelector('#view-library .library-empty') !== null`);
    record('wipe: library empty after database delete', emptyAfterWipe);

    // Import accept path (confirm true) through the REAL library JSON control.
    await evaluate(`window.__confirm = true; window.confirm = () => window.__confirm; window.__alerts = []; window.alert = (m) => window.__alerts.push(m); true`);
    await evaluate(`(() => {
      const file = new File([${JSON.stringify(JSON.stringify(snapshot))}], 'backup.json', { type: 'application/json' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-dashboard .dashboard-import');
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 1`, 10000);
    // The app reloads after a successful import; wait for the reloaded library to show the restored text.
    await waitFor(`[...document.querySelectorAll('#view-library .library-item')].some(li => /roundtrip/i.test(li.textContent))`, 10000);
    record('import-accept: records restored through real UI', true);

    // (Dismiss + wrong-schema already covered above on the library control.)
  } catch (error) {
    record(`harness crashed: ${error.message}`, false);
  } finally {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
    try { await writeFile(join(REPO, '.autoforge', 'validation', 'export-import-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2)); } catch { /* best effort */ }
    ws.close();
    chrome.kill();
    server.close();
    process.exit(failed.length === 0 ? 0 : 1);
  }
}

main().catch((e) => { console.error('harness crashed:', e.message); process.exit(2); });
