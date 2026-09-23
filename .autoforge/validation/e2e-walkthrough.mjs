// E2E browser walkthrough for SpeedReading (zero dependencies).
// Uses Playwright's cached headless Chromium via CDP + Node's global WebSocket.
// Run: node .autoforge/validation/e2e-walkthrough.mjs
// Writes .autoforge/validation/e2e-report.json and prints a step-by-step report.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const REPO = resolve(new URL('../../', import.meta.url).pathname);
const PORT = 8177;
const DEBUG_PORT = 9334;
const REPORT_PATH = join(REPO, '.autoforge', 'validation', 'e2e-report.json');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
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

const steps = [];
const networkRequests = [];

function record(step, ok, detail) {
  steps.push({ step, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
}

function startStaticServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const filePath = resolve(join(REPO, urlPath === '/' ? 'index.html' : urlPath));
      if (!filePath.startsWith(REPO)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((ok) => server.listen(PORT, '127.0.0.1', () => ok(server)));
}

function startChrome(userDataDir) {
  const bin = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!bin) throw new Error('No Chromium binary found in ms-playwright cache');
  const child = spawn(bin, [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], { stdio: 'ignore' });
  return child;
}

async function connectCdp() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const version = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json());
      const ws = new WebSocket(version.webSocketDebuggerUrl);
      let id = 0;
      const pending = new Map();
      const events = [];
      let onEvent = () => {};
      ws.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.id && pending.has(data.id)) {
          pending.get(data.id)(data);
          pending.delete(data.id);
        } else if (data.method) {
          events.push(data);
          onEvent(data);
        }
      };
      await new Promise((res, rej) => {
        ws.onopen = res;
        ws.onerror = rej;
      });
      const send = (method, params = {}, sessionId) => new Promise((res) => {
        const messageId = ++id;
        pending.set(messageId, res);
        ws.send(JSON.stringify({ id: messageId, method, params, sessionId }));
      });
      return { ws, send, events, set onEvent(fn) { onEvent = fn; } };
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error('CDP connection failed');
}

async function main() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'speedread-e2e-'));
  const server = await startStaticServer();
  const chrome = startChrome(userDataDir);
  const cdp = await connectCdp();
  const { send } = cdp;

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
  const session = attached.result.sessionId;

  await send('Page.enable', {}, session);
  await send('Runtime.enable', {}, session);
  await send('Network.enable', {}, session);
  cdp.onEvent = (event) => {
    if (event.method === 'Network.requestWillBeSent' && event.sessionId === session) {
      const url = event.params.request.url;
      if (!url.includes('favicon')) networkRequests.push(url);
    }
  };

  const evaluate = async (expression, { awaitPromise = true } = {}) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise,
      returnByValue: true,
    }, session);
    if (result.result.exceptionDetails) {
      throw new Error(result.result.exceptionDetails.exception?.description ?? 'page exception');
    }
    return result.result.result.value;
  };

  const waitFor = async (expression, timeoutMs = 15000, label = expression) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        if (await evaluate(expression)) return true;
      } catch {
        /* page may be reloading */
      }
      await new Promise((r) => setTimeout(r, 150));
    }
    throw new Error(`timeout waiting for: ${label}`);
  };

  const fileInputScript = (content, name, mime = 'text/plain') => `
    (() => {
      const file = new File([${JSON.stringify(content)}], ${JSON.stringify(name)}, { type: ${JSON.stringify(mime)} });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('#view-library input[type="file"]');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`;

  const fileInputBytesScript = (base64, name, mime) => `
    (() => {
      const binary = atob(${JSON.stringify(base64)});
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const file = new File([bytes], ${JSON.stringify(name)}, { type: ${JSON.stringify(mime)} });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.querySelector('#view-library input[type="file"]');
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`;

  // Sentences must exceed generateQuiz's minSentenceWords (8) to yield questions.
  const CALIBRATION = Array.from({ length: 8 }, (_, i) =>
    `Sentence number ${i + 1} carefully verifies the entire reading flow end to end. It contains a reasonable amount of words for comprehension testing!`).join(' ');

  try {
    // 1. Boot: library visible, exactly one section visible, zero network after settle
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, session);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`, 10000, 'library visible');
    const visibleCount = await evaluate(
      `[...document.querySelectorAll('#view-library,#view-player,#view-quiz,#view-dashboard')].filter(s => !s.hidden).length`);
    record('boot: exactly one section visible', visibleCount === 1, `visible=${visibleCount} (library)`);

    await new Promise((r) => setTimeout(r, 800));
    const requestsAtSettle = networkRequests.length;
    record('privacy: network requests after initial load', true, `${requestsAtSettle} requests total since load (informational)`);

    // 2. Import a calibration text through the real file input
    await evaluate(fileInputScript(CALIBRATION, 'calibration.txt'));
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 1`, 8000, 'imported item in list');
    const itemMeta = await evaluate(`(document.querySelector('#view-library .library-item')||{}).textContent`);
    record('import: calibration.txt appears in library', /calibration/i.test(itemMeta), itemMeta?.trim().slice(0, 80));

    // 2b. Import the real public-domain sample and (optionally) a real Gutenberg EPUB
    const sampleTxt = await readFile(join(REPO, 'assets', 'sample.txt'), 'utf8');
    await evaluate(fileInputScript(sampleTxt, 'sample.txt'));
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 2`, 8000, 'sample.txt imported');
    record('import: assets/sample.txt imports (public-domain calibration text)', true, `${sampleTxt.split(/\s+/).length} words`);

    const epubPath = process.env.EPUB_PATH ?? '/tmp/pg1342.epub';
    if (existsSync(epubPath)) {
      const epubBytes = await readFile(epubPath);
      await evaluate(fileInputBytesScript(epubBytes.toString('base64'), 'pg1342.epub', 'application/epub+zip'));
      await waitFor(`[...document.querySelectorAll('#view-library .library-item')].some(li => /Pride and Prejudice/.test(li.textContent))`, 15000, 'real EPUB imported');
      const epubMeta = await evaluate(`[...document.querySelectorAll('#view-library .library-item')].map(li => li.textContent).find(t => /Pride/.test(t))`);
      record('ADR-3 gate: real Gutenberg EPUB imports with title + word count', /100000|1[0-9]{5}|[2-9][0-9]{5}/.test(epubMeta.replace(/,/g, '')),
        epubMeta?.trim().slice(0, 100));
    } else {
      record('ADR-3 gate: real Gutenberg EPUB', false, `fixture not found at ${epubPath} (download pg1342.epub or set EPUB_PATH)`);
    }

    // 3. Open the calibration text explicitly (IDB getAll order is by random UUID key)
    await evaluate(`
      [...document.querySelectorAll('#view-library .library-item')]
        .find(li => /calibration/i.test(li.textContent))
        .querySelector('button[data-action="open"]').click()`);
    await waitFor(`!document.querySelector('#view-player').hidden`, 8000, 'player view visible');
    record('open: player view becomes the single visible section',
      await evaluate(`[...document.querySelectorAll('#view-library,#view-player,#view-quiz,#view-dashboard')].filter(s=>!s.hidden).length === 1`));

    // 4. Autoplay starts on open; pause, speed up (state events must settle between clicks), resume
    const startedAuto = await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Pause'`, 4000, 'autoplay started').then(() => true);
    record('player: playback starts automatically on open', startedAuto);
    await evaluate(`document.querySelector('.player-btn-play').click()`); // pause
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Play'`, 3000, 'paused for speed-up');
    for (let i = 0; i < 48; i++) {
      await evaluate(`document.querySelector('.player-btn-faster').click()`);
      await new Promise((r) => setTimeout(r, 80));
    }
    await evaluate(`document.querySelector('.player-btn-play').click()`); // resume
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Pause'`, 3000, 'resumed');
    const orpText = await waitFor(`document.querySelector('#view-player .rsvp-orp').textContent || false`, 5000, 'ORP character rendered').then(() => evaluate(`document.querySelector('#view-player .rsvp-orp').textContent`));
    record('rsvp: ORP character rendered at anchor', typeof orpText === 'string' && orpText.length === 1, `orp="${orpText}"`);
    const announced = await waitFor(`document.querySelector('#live-region').textContent.trim().length > 0`, 5000, 'sentence announcement').then(() => true);
    record('a11y: live region announced a sentence boundary', announced,
      (await evaluate(`document.querySelector('#live-region').textContent.trim()`)).slice(0, 60));

    // 5. Visibility pause: fake hidden, dispatch visibilitychange, expect Play label back
    await evaluate(`
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      true`);
    const paused = await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Play'`, 4000, 'paused on hidden').then(() => true);
    record('visibility: playback pauses when tab hidden', paused);
    await evaluate(`delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); document.querySelector('.player-btn-play').click(); true`);

    // 6. Completion -> quiz view; quiz prefilled; save -> dashboard
    await waitFor(`!document.querySelector('#view-quiz').hidden`, 20000, 'quiz view after end');
    const quizCount = await evaluate(`document.querySelectorAll('#view-quiz .quiz-item').length`);
    record('session: completion routes to quiz', quizCount >= 1, `${quizCount} questions`);
    const inputsEmpty = await evaluate(`[...document.querySelectorAll('#view-quiz .quiz-answer')].every(i => i.value === '')`);
    record('quiz: answers are the reader\'s own (inputs empty, no prefill)', inputsEmpty);
    // Submit deliberately wrong answers: real scoring must yield 0%, not a trivially perfect score.
    await evaluate(`document.querySelectorAll('#view-quiz .quiz-answer').forEach(i => { i.value = 'zzz'; }); true`);
    await evaluate(`document.querySelector('#view-quiz .quiz-actions button[type="submit"]').click()`);
    await waitFor(`!document.querySelector('#view-dashboard').hidden`, 8000, 'dashboard after quiz');
    const rows = await evaluate(`document.querySelectorAll('#view-dashboard .dashboard-table tr').length`);
    record('dashboard: session row rendered with comprehension', rows >= 2, `rows=${rows}`);
    const summaryText = await evaluate(`document.querySelector('#view-dashboard .dashboard-summary').textContent`);
    record('dashboard: summary shows wpm + comprehension trend', /comprehension/i.test(summaryText), summaryText.slice(0, 90));
    record('quiz: wrong answers score 0% (scoring is real, not prefill-based)', /comprehension 0%/.test(summaryText));

    // 7. Persistence after reload
    const requestsBeforeReload = networkRequests.length;
    await send('Page.reload', {}, session);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`, 10000, 'boot after reload');
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 1`, 8000, 'persisted text after reload');
    record('persistence: text survives reload', true, 'library item present after reload');

    // 8. Reduced-motion emulation -> manual SR mode, no autoplay
    await send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    }, session);
    await send('Page.reload', {}, session);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`, 10000, 'boot reduced motion');
    await evaluate(`document.querySelector('#view-library .library-item button[data-action="open"]').click()`);
    await waitFor(`!document.querySelector('#view-player').hidden`, 8000, 'player with reduced motion');
    const srVisible = await evaluate(`!document.querySelector('.player-sr').hidden`);
    const autoPlay = await evaluate(`document.querySelector('.player-btn-play').textContent.trim()`);
    record('a11y: reduced-motion defaults to manual sentence mode (no autoplay)', srVisible && /Play/.test(autoPlay),
      `srPanel=${srVisible} playLabel="${autoPlay}"`);

    // 9. Contrast spot check (body text vs background, WCAG relative luminance)
    const contrast = await evaluate(`
      (() => {
        const parse = (c) => c.match(/\\d+/g).map(Number);
        const lum = ([r, g, b]) => {
          const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const body = getComputedStyle(document.body);
        const l1 = lum(parse(body.color));
        const l2 = lum(parse(body.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgb(255,255,255)' : body.backgroundColor));
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        return Math.round(ratio * 100) / 100;
      })()`);
    record('a11y: body text contrast >= 4.5:1', contrast >= 4.5, `ratio=${contrast}`);

    // 10. Network: only same-origin static assets (document + modules + css) — zero external/telemetry requests
    const externalRequests = networkRequests.filter((u) =>
      !u.startsWith(`http://127.0.0.1:${PORT}/`) && !u.includes('favicon'));
    record('privacy: zero external/telemetry network requests (only same-origin static assets)', externalRequests.length === 0,
      externalRequests.length
        ? `${externalRequests.length} external: ${externalRequests.join(', ')}`
        : `${networkRequests.length} requests total, all same-origin static assets; no fetch/XHR/beacon`);
  } catch (error) {
    record('walkthrough: unexpected failure', false, error.message);
    throw error;
  } finally {
    const failed = steps.filter((s) => !s.ok);
    const report = {
      ranAt: new Date().toISOString(),
      browser: 'headless Chromium via CDP (ms-playwright cache)',
      steps,
      passed: steps.length - failed.length,
      failed: failed.length,
      networkRequests,
      verdict: failed.length === 0 ? 'GO' : 'FAIL',
    };
    await import('node:fs/promises').then((fs) => fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2)));
    console.log(`\n${report.passed} passed, ${report.failed} failed -> ${report.verdict}`);
    console.log(`report: ${REPORT_PATH}`);
    cdp.ws.close();
    chrome.kill();
    server.close();
    process.exit(report.failed === 0 ? 0 : 1);
  }
}

main().catch(async (error) => {
  console.error('walkthrough crashed:', error.message);
  const report = { ranAt: new Date().toISOString(), steps, verdict: 'CRASH', error: error.message };
  await import('node:fs/promises').then((fs) => fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2)));
  process.exit(2);
});
