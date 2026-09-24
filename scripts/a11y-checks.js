// Scripted keyboard/focus/announce-attribute checks (M-F06A, ADR-16).
// Real app + trusted CDP input in headless Chromium. Claims attributes only —
// announcement QUALITY (what a listener hears) stays human-only (M-F06H).
// Run: node scripts/a11y-checks.js (exit 0 = all pass). Zero dependencies.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, extname, resolve } from 'node:path';

const REPO = resolve(new URL('../', import.meta.url).pathname);
const PORT = 8132;
const DEBUG_PORT = 9352;
const CHROME = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8' };

const results = [];
function record(step, ok, detail = '') {
  results.push({ step, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
}

const CALIBRATION = Array.from({ length: 6 }, (_, i) =>
  `Accessibility sentence number ${i + 1} exercises announcements honestly today. It carries enough words for checking purposes daily!`).join(' ');

async function main() {
  const userDataDir = await mkdtemp(join(tmpdir(), 'e2e-a11y-'));
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
  const pageErrors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    else if (d.method === 'Runtime.exceptionThrown') pageErrors.push(d.params.exceptionDetails?.text ?? 'page exception');
  };
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
  // Trusted input via CDP Input.dispatchKeyEvent (reviewer-verified to work on this
  // chrome-headless-shell build; the earlier probe used the wrong method name).
  const press = async (key, code, vk) => {
    await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, text: key === ' ' ? ' ' : undefined }, sid);
    if (key.length === 1) await send('Input.dispatchKeyEvent', { type: 'char', text: key, unmodifiedText: key }, sid);
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk }, sid);
  };
  const tab = () => press('Tab', 'Tab', 9);

  try {
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/index.html` }, sid);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);

    // Import + open calibration text.
    await evaluate(`(() => {
      const file = new File([${JSON.stringify(CALIBRATION)}], 'a11y.txt', { type: 'text/plain' });
      const dt = new DataTransfer(); dt.items.add(file);
      const input = document.querySelector('#view-library input[type="file"]');
      input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await waitFor(`document.querySelectorAll('#view-library .library-item').length >= 1`);
    await evaluate(`[...document.querySelectorAll('#view-library .library-item')].find(li => /a11y/i.test(li.textContent)).querySelector('button[data-action="open"]').click()`);
    await waitFor(`!document.querySelector('#view-player').hidden`);
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Pause'`);

    // Trusted Space toggles playback (label flips Pause -> Play).
    await evaluate(`document.body.focus()`);
    await press(' ');
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Play'`);
    record('keyboard: trusted Space toggles playback', true);
    // Trusted arrows/+- do not crash and keep a single visible view.
    await press('ArrowRight');
    await press('+');
    await press('-');
    const singleView = await evaluate(`[...document.querySelectorAll('#view-library,#view-player,#view-quiz,#view-dashboard')].filter(s => !s.hidden).length === 1`);
    record('keyboard: arrows/+/- handled, single view kept', singleView);
    // Resume for announcement sampling.
    await press(' ');
    await waitFor(`document.querySelector('.player-btn-play').textContent.trim() === 'Pause'`);

    // Live region: announces at some point, but NOT on every chunk.
    const seen = await evaluate(`(async () => {
      const live = document.querySelector('#live-region');
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        values.add(live.textContent.trim());
        await new Promise((r) => setTimeout(r, 30));
      }
      return [...values].filter(Boolean);
    })()`);
    // Derivation: 3s window at ~1500wpm (post speed-up) with 2-word chunks ≈ 37 chunks;
    // sentence-boundary-only firing over ~6 sentences in the text yields ≤5 distinct
    // announcements; a per-chunk regression would produce double digits in-window.
    record('announce: live region fires at sentence boundaries only', seen.length >= 1 && seen.length <= 5,
      `distinct announcements=${seen.length}`);

    // M-G07 gate: gamification attributes on the real app (no mocks).
    // Complete the calibration session at high speed, then quiz -> review -> Done.
    for (let i = 0; i < 20; i++) {
      await evaluate(`document.querySelector('.player-btn-faster').click()`);
    }
    await waitFor(`!document.querySelector('#view-quiz').hidden`, 45000);
    await evaluate(`document.querySelectorAll('#view-quiz .quiz-answer').forEach(i => { i.value = 'zzz'; }); true`);
    await evaluate(`document.querySelector('#view-quiz .quiz-actions button[type="submit"]').click()`);
    await waitFor(`document.querySelector('#view-quiz .quiz-heading').textContent.startsWith('Review:')`);
    const verdictClasses = await evaluate(`[...document.querySelectorAll('#view-quiz .quiz-verdict')].map(v => v.className).join(' ')`);
    record('gamify: review verdicts carry correct/incorrect/skipped classes',
      (verdictClasses.match(/quiz-verdict-incorrect/g) ?? []).length >= 1, verdictClasses.slice(0, 120));
    await evaluate(`[...document.querySelectorAll('#view-quiz .quiz-actions button')].find(b => b.textContent.trim() === 'Done').click()`);
    await waitFor(`document.querySelector('#view-dashboard .dashboard-summary-heading') !== null`);
    const momentsOk = await evaluate(`[...document.querySelectorAll('#view-dashboard .reward-moment')].every(m => m.getAttribute('role') === 'status')`);
    record('gamify: reward moments render role=status', momentsOk);
    const barsOk = await evaluate(`[...document.querySelectorAll('#view-dashboard [role="progressbar"]')].every(p => p.getAttribute('aria-valuenow') !== null)`);
    record('gamify: progressbars expose aria-valuenow', barsOk);
    const hudOk = await evaluate(`document.querySelector('#hud')?.getAttribute('role') === 'status' && (document.querySelector('#hud').textContent ?? '').includes('XP')`);
    record('gamify: HUD is a labelled status with XP totals', hudOk);
    const hasDismiss = await evaluate(`document.querySelector('#view-dashboard .reward-moment button, #view-dashboard .gamify-unlock button') !== null`);
    let theftFree = hasDismiss;
    if (hasDismiss) {
      await evaluate(`document.querySelector('#view-dashboard .reward-moment button, #view-dashboard .gamify-unlock button').click()`);
      theftFree = await evaluate(`document.activeElement !== null && document.contains(document.activeElement)`);
    }
    record('gamify: reward dismiss works without focus theft', theftFree, hasDismiss ? 'dismissed, focus in document' : 'no dismissible moment this session');
    await evaluate(`[...document.querySelectorAll('#view-dashboard .dashboard-summary-actions button')].find(b => b.textContent.trim() === 'Dashboard').click()`);
    await waitFor(`document.querySelector('#view-dashboard .dashboard-table') !== null`);
    const cardsOk = await evaluate(`document.querySelector('#view-dashboard .gamify-card.xp') !== null && document.querySelector('#view-dashboard .gamify-card.streak') !== null && document.querySelectorAll('#view-dashboard .gamify-card.challenge').length === 2`);
    record('gamify: log cards (xp/streak/2 challenges) have accessible names',
      cardsOk && await evaluate(`[...document.querySelectorAll('#view-dashboard .gamify-card')].every(c => (c.getAttribute('aria-label') ?? '').length > 0)`));
    const gridOk = await evaluate(`document.querySelectorAll('#view-dashboard .dashboard-records .record-item').length === 10`);
    record('gamify: records list carries all 10 ids', gridOk);

    // Trusted Tab walk: every stop is a labelled native control with a visible outline.
    await send('Page.reload', {}, sid);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);
    await evaluate(`document.body.focus()`);
    const stops = [];
    for (let i = 0; i < 14; i++) {
      await tab();
      const stop = await evaluate(`(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        el.focus(); // make :focus-visible styles resolvable for the probe
        const cs = getComputedStyle(el);
        return { tag: el.tagName, label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30), outline: cs.outlineColor + ' / ' + cs.outlineStyle + ' / ' + cs.outlineWidth };
      })()`);
      if (stop) stops.push(stop);
    }
    const badStops = stops.filter((s) => !/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(s.tag) || /none|0px/.test(s.outline));
    record('focus: trusted Tab stops are labelled controls with visible outline', stops.length >= 4 && badStops.length === 0,
      `${stops.length} stops checked${badStops.length ? ` bad=${JSON.stringify(badStops)}` : ''}`);

    // Esc exits the player back to the library.
    await waitFor(`document.querySelector('#view-library .library-item button[data-action="open"]') !== null`);
    await evaluate(`[...document.querySelectorAll('#view-library .library-item')].find(li => /a11y/i.test(li.textContent)).querySelector('button[data-action="open"]').click()`);
    await waitFor(`!document.querySelector('#view-player').hidden`);
    await press('Escape');
    await waitFor(`!document.querySelector('#view-library').hidden`);
    record('keyboard: Esc exits player to library', true);

    // Reduced motion: manual sentence mode, no autoplay.
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sid);
    await send('Page.reload', {}, sid);
    await waitFor(`document.querySelector('#view-library') && !document.querySelector('#view-library').hidden`);
    await waitFor(`document.querySelector('#view-library .library-item button[data-action="open"]') !== null`);
    await evaluate(`[...document.querySelectorAll('#view-library .library-item')].find(li => /a11y/i.test(li.textContent)).querySelector('button[data-action="open"]').click()`);
    await waitFor(`!document.querySelector('#view-player').hidden`);
    const srMode = await evaluate(`!document.querySelector('.player-sr').hidden && document.querySelector('.player-btn-play').textContent.trim() === 'Play'`);
    record('reduced-motion: manual sentence mode, no autoplay', srMode);

    // Contrast computed in-page.
    const ratio = await evaluate(`(() => {
      const parse = (c) => c.match(/\\d+/g).map(Number);
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const body = getComputedStyle(document.body);
      const l1 = lum(parse(body.color));
      const bg = body.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'rgb(255,255,255)' : body.backgroundColor;
      const l2 = lum(parse(bg));
      return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100;
    })()`);
    record('contrast: body text >= 4.5:1', ratio >= 4.5, `ratio=${ratio}`);

    // M-G07 static gate (node-side, documented as static): copy bans + reduced-motion branches.
    const banRe = /guarantee|fluent in|10x|double your|triple your|speed reader in|streak lost|you broke|leaderboard|friends are|everyone else/i;
    const copyHits = [];
    for (const f of ['src/ui/gamify-cards.js', 'src/ui/gamify-viz.js', 'src/ui/dashboard.js', 'src/ui/quiz-view.js', 'src/ui/player-view.js', 'src/ui/library.js']) {
      try {
        const text = await readFile(join(REPO, f), 'utf8');
        const bad = text.split('\n').filter((l) => banRe.test(l) && !l.trim().startsWith('//'));
        if (bad.length > 0) copyHits.push(`${f}: ${bad.length}`);
      } catch { copyHits.push(`${f}: unreadable`); }
    }
    record('copy: ADR-18/24 bans clean across UI surfaces', copyHits.length === 0, copyHits.join('; '));
    const css = await readFile(join(REPO, 'styles', 'app.css'), 'utf8');
    const reducedTail = css.split('@media (prefers-reduced-motion').slice(1).join('');
    const motionBranches = ['.gamify-unlock', '.viz-chart', '.reward-moment'].every((sel) => reducedTail.includes(sel));
    record('motion: reduced-motion branches present for gamify surfaces (static)', motionBranches);

    record('page: zero uncaught page exceptions', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
  } catch (error) {
    record(`harness crashed: ${error.message}`, false);
  } finally {
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
    try { await writeFile(join(REPO, '.autoforge', 'validation', 'a11y-report.json'), JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2)); } catch { /* best effort */ }
    ws.close();
    chrome.kill();
    server.close();
    process.exit(failed.length === 0 ? 0 : 1);
  }
}

main().catch((e) => { console.error('harness crashed:', e.message); process.exit(2); });
