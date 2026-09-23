// IndexedDB failure-path harness (M-F07, ADR-15). Real store module in headless Chromium.
// Simulated faults (quota/abort/malformed) vs REAL recovery paths; data-intact asserts.
// Run: node scripts/idb-failure.js (exit 0 = all pass). Zero dependencies.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const REPO = resolve(new URL('../', import.meta.url).pathname);
const PORT = 8133;
const DEBUG_PORT = 9353;
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const results = [];
function record(step, ok, detail = '') {
  results.push({ step, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
}

const CALIBRATION = 'Failure path seed text with enough words to import reliably here.';

async function main() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'e2e-idb-'));
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

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sid);
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? 'page exception');
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
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);

    // Import the REAL store module in-page and seed one record.
    const seeded = await evaluate(`(async () => {
      const store = await (await import('/src/lib/store.js')).openStore();
      window.__store = store;
      await store.put('texts', { id: 'seed-1', title: 'Seed', source: 'txt', chapters: [], totalWords: 0 });
      return (await store.getAll('texts')).length;
    })()`);
    record('seed: real store holds a record', seeded === 1, `count=${seeded}`);

    // Quota fault: override put to throw QuotaExceededError; expect readable rejection + intact data.
    const quota = await evaluate(`(async () => {
      const proto = IDBObjectStore.prototype;
      const original = proto.put;
      proto.put = function () { throw new DOMException('Quota exceeded', 'QuotaExceededError'); };
      let outcome;
      try {
        await window.__store.put('texts', { id: 'q-1', title: 'Q' });
        outcome = { rejected: false };
      } catch (e) { outcome = { rejected: true, name: e.name, message: String(e.message || e).slice(0, 60) }; }
      proto.put = original;
      const count = (await window.__store.getAll('texts')).length;
      const probe = await window.__store.put('texts', { id: 'q-ok', title: 'Q' }).then(() => 'recovered').catch((e) => 'still-broken:' + e.name);
      await window.__store.del('texts', 'q-ok');
      return { ...outcome, count, probe };
    })()`);
    record('quota: readable rejection, data intact, store recovers',
      quota.rejected && /quota/i.test(quota.name + quota.message) && quota.count === 1 && quota.probe === 'recovered',
      JSON.stringify(quota));

    // DataClone fault: un-cloneable function value must reject readably without hanging.
    const clone = await evaluate(`(async () => {
      let outcome;
      try {
        await window.__store.put('texts', { id: 'c-1', title: 'C', fn: () => {} });
        outcome = { rejected: false };
      } catch (e) { outcome = { rejected: true, name: e.name, message: String(e.message || e).slice(0, 60) }; }
      const count = (await window.__store.getAll('texts')).length;
      return { ...outcome, count };
    })()`);
    record('dataclone: readable rejection, data intact',
      clone.rejected && clone.message.length > 0 && clone.count === 1, JSON.stringify(clone));

    // Malformed import payloads: documented error objects, existing data intact.
    const malformed = await evaluate(`(async () => {
      const r1 = await window.__store.importAll({ schemaVersion: 999 });
      const r2 = await window.__store.importAll({ schemaVersion: 1, texts: 'nope' });
      const r3 = await window.__store.importAll(null);
      const count = (await window.__store.getAll('texts')).length;
      return { r1, r2, r3, count };
    })()`);
    record('import-malformed: documented errors, data intact',
      malformed.r1?.ok === false && /schema/i.test(malformed.r1?.error ?? '') &&
      malformed.r2?.ok === false && /invalid-field:texts/.test(malformed.r2?.error ?? '') &&
      malformed.r3?.ok === false && malformed.count === 1,
      `r1=${JSON.stringify(malformed.r1)} r2=${JSON.stringify(malformed.r2)}`);

    // UI recovery path: bad JSON through the REAL library import control surfaces an alert.
    await evaluate(`window.__alerts = []; window.alert = (m) => window.__alerts.push(m); window.confirm = () => true; true`);
    await evaluate(`(() => {
      const file = new File([JSON.stringify({ schemaVersion: 999 })], 'bad.json', { type: 'application/json' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-library .library-json-input');
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await new Promise((r) => setTimeout(r, 800));
    const alerts = await evaluate(`window.__alerts`);
    const intact = await evaluate(`(async () => (await window.__store.getAll('texts')).length)()`);
    record('ui-recovery: bad import alerts readably via existing path, data intact',
      alerts.some((m) => /schema/i.test(m)) && intact === 1,
      `alerts=${JSON.stringify(alerts).slice(0, 80)}`);
  } catch (error) {
    record(`harness crashed: ${error.message}`, false);
  } finally {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
    try { await writeFile(join(REPO, '.autoforge', 'validation', 'idb-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2)); } catch { /* best effort */ }
    ws.close();
    chrome.kill();
    server.close();
    process.exit(failed.length === 0 ? 0 : 1);
  }
}

main().catch((e) => { console.error('harness crashed:', e.message); process.exit(2); });
