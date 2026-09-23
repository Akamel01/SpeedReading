// MEASURE FIRST on a 130k-word book (M-F08, ADR-17). Real pipeline functions only.
// Corpus: /tmp/pg1342.epub via the real EPUB path when present, else deterministic synthetic text.
// Budgets: tokenize+chunk wall < 2000ms (Node), chunk-array heap < 100MB.
// Code change ONLY on measured miss. Run: node scripts/perf-large-book.js. Zero dependencies.
import { existsSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { execSync } from 'node:child_process';
import { tokenize, chunk } from '../src/lib/text.js';
import { normalizeTxt, chapterize } from '../src/lib/pipeline.js';
import { epubToChapters } from '../src/lib/epub.js';
import { readFile } from 'node:fs/promises';

function syntheticBook(targetWords) {
  const para = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.';
  const words = para.split(' ');
  const out = [];
  while (out.length < targetWords) out.push(...words);
  return out.slice(0, targetWords).join(' ');
}

const EPUB_PATH = '/tmp/pg1342.epub';
let corpusName;
let text;
if (existsSync(EPUB_PATH)) {
  const buf = await readFile(EPUB_PATH);
  const book = await epubToChapters(new Uint8Array(buf));
  text = book.chapters.map((c) => c.text).join('\n\n');
  corpusName = `real-epub:${book.title}`;
} else {
  text = syntheticBook(130000);
  corpusName = 'synthetic-130k';
}
const wordCount = text.split(/\s+/).filter(Boolean).length;

const memBefore = process.memoryUsage().heapUsed;
const t0 = performance.now();
const normalized = normalizeTxt(text);
const t1 = performance.now();
const chaptered = chapterize(normalized);
const t2 = performance.now();
const tokens = tokenize(normalized);
const t3 = performance.now();
const chunks = chunk(tokens, { size: 2 });
const t4 = performance.now();
const memAfter = process.memoryUsage().heapUsed;

const normalizeMs = t1 - t0;
const chapterizeMs = t2 - t1;
const tokenizeMs = t3 - t2;
const chunkMs = t4 - t3;
const heapDeltaMB = (memAfter - memBefore) / 1024 / 1024;
const charBytes = chunks.reduce((sum, c) => sum + c.text.length, 0) * 2;
const heapEstimateMB = (memBefore + charBytes) / 1024 / 1024 > 0
  ? (charBytes + (memAfter - memBefore)) / 1024 / 1024
  : 0;

const pass = tokenizeMs + chunkMs < 2000 && heapEstimateMB < 100;
console.log(`corpus: ${corpusName} | words: ${wordCount} | chapters: ${chaptered.length} | chunks: ${chunks.length}`);
console.log(`normalizeMs=${normalizeMs.toFixed(1)} chapterizeMs=${chapterizeMs.toFixed(1)} tokenizeMs=${tokenizeMs.toFixed(1)} chunkMs=${chunkMs.toFixed(1)}`);
console.log(`heapDeltaMB=${heapDeltaMB.toFixed(1)} heapEstimateMB=${heapEstimateMB.toFixed(1)}`);
console.log(`verdict: ${pass ? 'PASS' : 'FAIL'} (budgets: tokenize+chunk<2000ms, heap<100MB)`);
let diff = '';
try {
  diff = execSync('git status --porcelain src/ styles/', { encoding: 'utf8' }).trim();
} catch { diff = '(git unavailable)'; }
console.log(`app-diff-on-pass: ${diff === '' ? 'clean' : diff}`);
process.exit(pass ? 0 : 1);
