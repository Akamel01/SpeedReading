import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readZip, UnsupportedFormatError } from '../src/lib/zip.js';
import { buildZip } from './helpers/zip-fixture.js';

test('stored entry round-trips through readZip as a Map', async () => {
  const zip = buildZip([{ name: 'hello.txt', data: 'hello world', method: 0 }]);
  const files = await readZip(new Uint8Array(zip));
  assert.ok(files instanceof Map);
  assert.deepEqual([...files.keys()], ['hello.txt']);
  assert.equal(new TextDecoder().decode(files.get('hello.txt')), 'hello world');
});

test('deflated entry round-trips through readZip', async () => {
  const zip = buildZip([{ name: 'dir/notes.txt', data: 'deflate me please', method: 8 }]);
  const files = await readZip(zip);
  assert.equal(new TextDecoder().decode(files.get('dir/notes.txt')), 'deflate me please');
});

test('multiple entries keep names and order', async () => {
  const zip = buildZip([
    { name: 'a.txt', data: 'AAA' },
    { name: 'b/c.txt', data: 'CCC', method: 8 },
  ]);
  const files = await readZip(new Uint8Array(zip));
  assert.deepEqual([...files.keys()], ['a.txt', 'b/c.txt']);
  assert.equal(new TextDecoder().decode(files.get('b/c.txt')), 'CCC');
});

test('zip64 marker rejects with UnsupportedFormatError', async () => {
  const zip = buildZip([{ name: 'big.txt', data: 'x', zip64: true }]);
  await assert.rejects(() => readZip(zip), (err) => err instanceof UnsupportedFormatError && /ZIP64/.test(err.message));
});

test('unsupported compression method rejects with method number', async () => {
  const zip = buildZip([{ name: 'weird.txt', data: 'x', method: 9 }]);
  await assert.rejects(() => readZip(zip), (err) => err instanceof UnsupportedFormatError && /method 9/.test(err.message));
});

test('encrypted entry rejects with UnsupportedFormatError', async () => {
  const zip = buildZip([{ name: 'secret.txt', data: 'x', flags: 0x1 }]);
  await assert.rejects(() => readZip(zip), (err) => err instanceof UnsupportedFormatError && /Encrypted/.test(err.message));
});

test('random bytes reject (no EOCD)', async () => {
  await assert.rejects(() => readZip(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])), UnsupportedFormatError);
});

test('truncated archive rejects', async () => {
  const zip = buildZip([{ name: 't.txt', data: 'truncate' }]);
  await assert.rejects(() => readZip(zip.subarray(0, zip.length - 42)), UnsupportedFormatError);
});
