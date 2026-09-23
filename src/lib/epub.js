// Minimal EPUB text extractor built on readZip. Pure ESM, zero dependencies.
// Contract: epubToChapters(ArrayBuffer|Uint8Array) -> Promise<{title, chapters:[{index,title,text,wordCount}]}>

import { readZip, UnsupportedFormatError } from './zip.js';

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
  bull: '\u2022', middot: '\u00b7', laquo: '\u00ab', raquo: '\u00bb',
  copy: '\u00a9', reg: '\u00ae', trade: '\u2122', deg: '\u00b0',
  times: '\u00d7', divide: '\u00f7', plusmn: '\u00b1', frac12: '\u00bd',
};

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

function stripMarkup(html) {
  const withoutBlocks = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return decodeEntities(withoutBlocks.replace(/<[^>]*>/g, ' '))
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeUtf8(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function resolveHref(baseDir, href) {
  const clean = href.split(/[#?]/)[0];
  let decoded = clean;
  try {
    decoded = decodeURIComponent(clean);
  } catch {
    /* keep raw href when malformed */
  }
  const joined = decoded.startsWith('/') ? decoded.slice(1) : baseDir ? `${baseDir}/${decoded}` : decoded;
  return joined
    .split('/')
    .reduce((segments, part) => {
      if (part === '..') segments.pop();
      else if (part !== '.' && part !== '') segments.push(part);
      return segments;
    }, [])
    .join('/');
}

export async function epubToChapters(input) {
  const files = await readZip(input);

  const containerBytes = files.get('META-INF/container.xml');
  if (!containerBytes) throw new UnsupportedFormatError('Not an EPUB: META-INF/container.xml missing');
  const rootMatch = decodeUtf8(containerBytes).match(/<rootfile\b[^>]*full-path=["']([^"']+)["']/i);
  if (!rootMatch) throw new UnsupportedFormatError('Not an EPUB: rootfile not declared in container.xml');
  const opfPath = rootMatch[1].replace(/^\/+/, '');

  const opfBytes = files.get(opfPath);
  if (!opfBytes) throw new UnsupportedFormatError(`Not an EPUB: package document ${opfPath} missing`);
  const opf = decodeUtf8(opfBytes);

  const titleMatch = opf.match(/<dc:title\b[^>]*>([\s\S]*?)<\/dc:title>/i);
  const fallbackTitle = opfPath.split('/').pop().replace(/\.[^.]+$/, '');
  const title = titleMatch ? decodeEntities(stripMarkup(titleMatch[1])) || fallbackTitle : fallbackTitle;

  const manifest = new Map();
  for (const item of opf.matchAll(/<item\b[^>]*>/gi)) {
    const tag = item[0];
    const id = tag.match(/\bid=["']([^"']+)["']/i);
    const href = tag.match(/\bhref=["']([^"']+)["']/i);
    if (id && href) manifest.set(id[1], href[1]);
  }
  const spine = [...opf.matchAll(/<itemref\b[^>]*idref=["']([^"']+)["']/gi)].map((m) => m[1]);
  if (spine.length === 0) throw new UnsupportedFormatError('Not an EPUB: spine is empty');

  const baseDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : '';
  const chapters = [];
  for (const idref of spine) {
    const href = manifest.get(idref);
    if (!href) continue;
    const chapterBytes = files.get(resolveHref(baseDir, href));
    if (!chapterBytes) continue;
    const xhtml = decodeUtf8(chapterBytes);
    const text = stripMarkup(xhtml);
    if (!text) continue;
    const heading = xhtml.match(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const headingText = heading ? stripMarkup(heading[1]) : '';
    chapters.push({
      index: chapters.length,
      title: headingText || `Chapter ${chapters.length + 1}`,
      text,
      wordCount: countWords(text),
    });
  }
  if (chapters.length === 0) throw new UnsupportedFormatError('No readable text found in EPUB spine');

  return { title, source: 'epub', chapters };
}
