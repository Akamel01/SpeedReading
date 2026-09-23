import { test as nodeTest } from 'node:test';
import assert from 'node:assert';

const { normalizeTxt, chapterize, ingest, UnsupportedFormatError } = await import('../src/lib/pipeline.js');

nodeTest('normalizeTxt: BOM, CRLF, blank collapsing', async () => {
  const input = '\uFEFFLine1\r\nLine2\r\n\r\n\r\nLine3   \n';
  const out = normalizeTxt(input);
  assert.strictEqual(out, 'Line1\nLine2\n\n\nLine3');
});

nodeTest('chapterize: multi-chapter from headings', async () => {
  const text = 'Chapter 1\nThis is the first.\n\n## Section 2\nThis is second.\n';
  const chapters = chapterize(text);
  assert.ok(Array.isArray(chapters));
  assert.ok(chapters.length >= 2);
  assert.strictEqual(chapters[0].title, 'Chapter 1');
  // second chapter title inferred from markdown heading
  assert.ok(chapters[1].title.includes('Section 2'));
});

nodeTest('chapterize: no headings -> single Full text', async () => {
  const text = 'Only one paragraph of text';
  const chapters = chapterize(text);
  assert.strictEqual(chapters.length, 1);
  assert.strictEqual(chapters[0].title, 'Full text');
});

nodeTest('chapterize: consecutive headings merge with no title loss (reviewer fix)', async () => {
  const chapters = chapterize('PART ONE\nCHAPTER 1\nOnce upon a time.');
  assert.strictEqual(chapters.length, 1);
  assert.match(chapters[0].title, /PART ONE/);
  assert.match(chapters[0].title, /CHAPTER 1/);
  assert.match(chapters[0].text, /Once upon a time\./);
});

nodeTest('chapterize: mid-sentence "Part of ..." is not a heading (reviewer fix)', async () => {
  const chapters = chapterize('Real prose here.\nPart of this sentence continues.');
  assert.strictEqual(chapters.length, 1);
  assert.match(chapters[0].text, /Part of this sentence continues\./);
});

nodeTest('chapterize: trailing heading preserved as empty chapter (reviewer fix)', async () => {
  const chapters = chapterize('Body text.\nChapter 9');
  assert.strictEqual(chapters.length, 2);
  assert.strictEqual(chapters[1].title, 'Chapter 9');
  assert.strictEqual(chapters[1].text, '');
});

nodeTest('ingest: .txt yields txt source and words', async () => {
  const enc = new TextEncoder();
  const payload = enc.encode('Hello world');
  const res = await ingest({ name: 'sample.txt', arrayBuffer: payload.buffer });
  assert.strictEqual(res.title, 'sample');
  assert.strictEqual(res.source, 'txt');
  assert.strictEqual(res.chapters.length, 1);
  assert.strictEqual(res.chapters[0].wordCount, 2);
});

nodeTest('ingest: unknown extension throws', async () => {
  let threw = false;
  try {
    await ingest({ name: 'notes.xyz', arrayBuffer: new ArrayBuffer(0) });
  } catch (e) {
    threw = true;
    assert.ok(e instanceof UnsupportedFormatError);
    assert.ok(String(e).includes('Unsupported file type'));
  }
  assert.ok(threw);
});

nodeTest('ingest: .md strips formatting and chapterizes', async () => {
  const enc = new TextEncoder();
  const md = '# Chapter One\n\nThis is **bold** and *italic* with a [link](https://x.example).\n\n- item one\n- item two\n\n> quoted line\n';
  const res = await ingest({ name: 'notes.md', arrayBuffer: enc.encode(md).buffer });
  assert.strictEqual(res.source, 'md');
  assert.strictEqual(res.chapters[0].title, 'Chapter One');
  assert.match(res.chapters[0].text, /This is bold and italic with a link\./);
  assert.match(res.chapters[0].text, /item one/);
  assert.doesNotMatch(res.chapters[0].text, /[#*>\[\]()]/);
});

nodeTest('ingest: .docx dispatches to the docx module (not the unknown-type error)', async () => {
  const enc = new TextEncoder();
  await assert.rejects(
    ingest({ name: 'empty.docx', arrayBuffer: enc.encode('not a zip').buffer }),
    // Error classes are per-module; assert the contract (name + routed past the unknown-type error)
    (err) => err?.name === 'UnsupportedFormatError' && !/Unsupported file type/.test(err.message),
  );
});

nodeTest('ingest: unknown extension still rejected', async () => {
  const enc = new TextEncoder();
  await assert.rejects(
    ingest({ name: 'notes.xyz', arrayBuffer: enc.encode('x').buffer }),
    /Unsupported file type: xyz/,
  );
});

nodeTest('ingest: epub dynamic import loads via helper fixture', async () => {
  const { buildEpubFixture } = await import('./helpers/zip-fixture.js');
  const buf = buildEpubFixture();
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const res = await ingest({ name: 'fixture.epub', arrayBuffer });
  assert.strictEqual(res.source, 'epub');
  assert.strictEqual(res.title, 'Test Book');
  assert.strictEqual(res.chapters.length, 2);
  assert.strictEqual(res.chapters[0].title, 'Chapter One');
});
