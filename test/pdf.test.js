import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupPagesToChapters, pdfToChapters, UnsupportedFormatError } from '../src/lib/pdf.js';
import { buildMinimalPdf } from './helpers/pdf-fixture.js';

test('groupPagesToChapters groups by outline boundaries', () => {
  const pages = [
    { index: 0, text: 'Cover page' },
    { index: 1, text: 'Chapter one begins here' },
    { index: 2, text: 'Chapter one continues' },
    { index: 3, text: 'Chapter two begins' },
  ];
  const chapters = groupPagesToChapters(pages, [
    { pageIndex: 1, title: 'One' },
    { pageIndex: 3, title: 'Two' },
  ]);
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].title, 'One');
  assert.match(chapters[0].text, /begins here/);
  assert.match(chapters[0].text, /continues/);
  assert.equal(chapters[1].title, 'Two');
});

test('groupPagesToChapters falls back to one chapter without outline', () => {
  const chapters = groupPagesToChapters(
    [{ index: 0, text: 'Alpha beta' }, { index: 1, text: 'Gamma delta' }],
    [],
  );
  assert.equal(chapters.length, 1);
  assert.equal(chapters[0].title, 'Full text');
  assert.equal(chapters[0].wordCount, 4);
});

test('pdfToChapters extracts text from a minimal PDF', async () => {
  const buf = buildMinimalPdf(['Hello speed reading world.', 'Second page here.']);
  const book = await pdfToChapters(new Uint8Array(buf), { filename: 'mini.pdf' });
  assert.equal(book.source, 'pdf');
  assert.equal(book.title, 'mini');
  assert.equal(book.chapters.length, 1);
  assert.match(book.chapters[0].text, /Hello speed reading world\./);
  assert.match(book.chapters[0].text, /Second page here\./);
});

test('pdfToChapters rejects garbage input', async () => {
  await assert.rejects(() => pdfToChapters(new Uint8Array([1, 2, 3, 4]), { filename: 'x.pdf' }), UnsupportedFormatError);
});
