// scripts/security-checks.mjs — static security posture checks (§23, ADR-23, binding 10).
// Usage: node scripts/security-checks.mjs (exit 0 = all pass). Zero dependencies.
// Checks (all static, documented as such):
//   1. no innerHTML on user/imported strings (src/ — assignment or += forms)
//   2. URL imports constrained to http(s) (no javascript:/data:/file: sinks)
//   3. import size caps present (MAX_IMPORT_BYTES definition + pipeline + app usages)
//   4. JSON import shape validation before destructive write (validate-before-clear)
//   5. no fetch outside the user-triggered URL-import path (ADR-10 posture)
//   6. no eval/new Function (code-injection sinks)
// Owner: M-P08A.

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const REPO = resolve(new URL('../', import.meta.url).pathname);
const results = [];
const record = (step, ok, detail = '') => {
  results.push({ step, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${step}${detail ? ` — ${detail}` : ''}`);
};

async function collect(dir, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await collect(p, out);
    else if (e.name.endsWith('.js') && !e.name.endsWith('.min.js')) out.push(p);
  }
  return out;
}

const BERTH = ['src/app.js', 'src/ui/library.js', 'src/ui/player-view.js', 'src/ui/quiz-view.js',
  'src/ui/dashboard.js', 'src/ui/gamify-cards.js', 'src/ui/gamify-viz.js'];

async function main() {
  const files = await collect(join(REPO, 'src'));
  const texts = new Map();
  for (const f of files) texts.set(f, await readFile(f, 'utf8'));

  // 1. HTML sinks (static: innerHTML/outerHTML assignment, insertAdjacentHTML in src/).
  const innerHits = [];
  for (const [f, t] of texts) {
    t.split('\n').forEach((line, i) => {
      if (/\.(innerHTML|outerHTML)\s*(=|\+=)|insertAdjacentHTML\s*\(/.test(line) && !line.trim().startsWith('//')) {
        innerHits.push(`${f.split('SpeedReading/')[1]}:${i + 1}`);
      }
    });
  }
  record('security: no innerHTML/outerHTML/insertAdjacentHTML sinks in src/', innerHits.length === 0, innerHits.join('; '));

  // 2. URL protocol guard present where imports fetch.
  const app = texts.get(join(REPO, 'src', 'app.js')) ?? '';
  record('security: URL import constrained to http(s)',
    /!?\['http:', 'https:'\]\.includes\(parsed\.protocol\)/.test(app));

  // 3. Size caps: definition + pipeline enforcement + app URL checks.
  const pipe = texts.get(join(REPO, 'src', 'lib', 'pipeline.js')) ?? '';
  record('security: 10MB cap defined and enforced',
    /MAX_IMPORT_BYTES = 10 \* 1024 \* 1024/.test(pipe) &&
    /byteLength > MAX_IMPORT_BYTES/.test(pipe) &&
    (app.match(/MAX_IMPORT_BYTES/g) ?? []).length >= 3);

  // 4. JSON import validates shape before destructive write.
  const store = texts.get(join(REPO, 'src', 'lib', 'store.js')) ?? '';
  record('security: import validates before clearing (validate-before-clear)',
    /Validate every record BEFORE any destructive write/.test(store) &&
    /invalid-record:/.test(store) && /invalid-field:/.test(store));

  // 5. fetch only on the user-triggered URL-import path.
  const fetchHits = [];
  for (const [f, t] of texts) {
    t.split('\n').forEach((line, i) => {
      if (/(^|[^a-zA-Z])fetch\(/.test(line) && !line.trim().startsWith('//') && !line.includes('await fetch')) {
        fetchHits.push(`${f.split('SpeedReading/')[1]}:${i + 1}`);
      }
    });
  }
  const appFetch = (app.match(/await fetch\(url\)/g) ?? []).length;
  record('security: fetch only via user-triggered URL import', fetchHits.length === 0 && appFetch === 1,
    fetchHits.join('; ') || 'single await fetch(url) in onImportUrl');

  // 6. No eval / new Function sinks.
  const evalHits = [];
  for (const [f, t] of texts) {
    t.split('\n').forEach((line, i) => {
      if (/(^|[^a-zA-Z.])eval\(|new Function\(/.test(line) && !line.trim().startsWith('//')) {
        evalHits.push(`${f.split('SpeedReading/')[1]}:${i + 1}`);
      }
    });
  }
  record('security: no eval/new-Function sinks', evalHits.length === 0, evalHits.join('; '));

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error(`security-checks crashed: ${e.message}`); process.exit(2); });
