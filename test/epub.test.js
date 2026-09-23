import { test } from 'node:test';
import assert from 'node:assert/strict';
import { epubToChapters } from '../src/lib/epub.js';
import { UnsupportedFormatError } from '../src/lib/zip.js';
import { buildEpubFixture, buildZip } from './helpers/zip-fixture.js';

test('epubToChapters extracts title, spine order, stripped markup, decoded entities', async () => {
  const { title, chapters } = await epubToChapters(new Uint8Array(buildEpubFixture()));
  assert.equal(title, 'Test Book');
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].title, 'Chapter One');
  assert.equal(chapters[1].title, 'Chapter Two');
  assert.match(chapters[0].text, /Hello & welcome to speed reading\./);
  assert.doesNotMatch(chapters[0].text, /bad\(\)/, 'script content must be stripped');
  assert.match(chapters[1].text, /&#8212;|—/, 'entity source must be decoded or removed');
  assert.ok(chapters[0].wordCount > 0);
  assert.deepEqual(chapters.map((c) => c.index), [0, 1]);
});

test('missing container.xml rejects with UnsupportedFormatError', async () => {
  const zip = buildZip([{ name: 'OEBPS/content.opf', data: '<package/>' }]);
  await assert.rejects(() => epubToChapters(zip), UnsupportedFormatError);
});

test('empty spine rejects with UnsupportedFormatError', async () => {
  const opf = `<package xmlns="http://www.idpf.org/2007/opf"><metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">T</dc:title></metadata><manifest/><spine/></package>`;
  const zip = buildZip([
    { name: 'META-INF/container.xml', data: '<container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>' },
    { name: 'content.opf', data: opf },
  ]);
  await assert.rejects(() => epubToChapters(zip), UnsupportedFormatError);
});

test('spine chapters with only markup reject (no readable text)', async () => {
  const opf = `<package><metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">T</dc:title></metadata><manifest><item id="c1" href="c1.xhtml"/></manifest><spine><itemref idref="c1"/></spine></package>`;
  const zip = buildZip([
    { name: 'META-INF/container.xml', data: '<container><rootfiles><rootfile full-path="content.opf"/></rootfiles></container>' },
    { name: 'content.opf', data: opf },
    { name: 'c1.xhtml', data: '<html><body><script>x()</script></body></html>' },
  ]);
  await assert.rejects(() => epubToChapters(zip), UnsupportedFormatError);
});
