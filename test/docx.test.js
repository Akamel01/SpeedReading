import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docxToChapters } from '../src/lib/docx.js';
import { UnsupportedFormatError } from '../src/lib/zip.js';
import { buildZip } from './helpers/zip-fixture.js';

const CONTENT_TYPES = `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>`;

function documentXml(paragraphs) {
  return `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`;
}

function para(text, heading) {
  const style = heading ? `<w:pPr><w:pStyle w:val="Heading${heading}"/></w:pPr>` : '';
  return `<w:p>${style}<w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
}

function buildDocx(paragraphs, method = 0) {
  return buildZip([
    { name: '[Content_Types].xml', data: CONTENT_TYPES, method: 0 },
    { name: 'word/document.xml', data: documentXml(paragraphs), method },
  ]);
}

test('docxToChapters extracts paragraphs in order with headings', async () => {
  const buf = buildDocx([para('Chapter One', 1), para('Hello world & friends.'), para('Second paragraph here.')]);
  const book = await docxToChapters(new Uint8Array(buf));
  assert.equal(book.source, 'docx');
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].title, 'Chapter One');
  assert.match(book.chapters[0].text, /Hello world & friends\./);
  assert.ok(book.chapters[0].wordCount > 0);
});

test('docxToChapters handles deflated package and multiple chapters', async () => {
  const buf = buildDocx(
    [para('First', 1), para('Body one two three.'), para('Second', 2), para('Body four five six.')],
    8,
  );
  const book = await docxToChapters(buf);
  assert.equal(book.chapters.length, 2);
  assert.equal(book.chapters[0].title, 'First');
  assert.equal(book.chapters[1].title, 'Second');
});

test('docxToChapters rejects missing document.xml', async () => {
  const buf = buildZip([{ name: '[Content_Types].xml', data: CONTENT_TYPES }]);
  await assert.rejects(() => docxToChapters(buf), UnsupportedFormatError);
});

test('docxToChapters preserves a heading-only document as an empty chapter', async () => {
  const buf = buildDocx([`<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Lonely</w:t></w:r></w:p>`]);
  const book = await docxToChapters(buf);
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].title, 'Lonely');
  assert.equal(book.chapters[0].text, '');
});

test('docxToChapters rejects a package with no paragraphs', async () => {
  const buf = buildZip([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: 'word/document.xml', data: documentXml([]) },
  ]);
  await assert.rejects(() => docxToChapters(buf), UnsupportedFormatError);
});
