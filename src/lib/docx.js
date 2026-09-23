// Minimal DOCX text extractor built on readZip. Pure ESM, zero dependencies.
// Contract: docxToChapters(ArrayBuffer|Uint8Array) -> Promise<{title, source:'docx', chapters:[{index,title,text,wordCount}]}>

import { readZip, UnsupportedFormatError } from './zip.js';

function decodeXml(text) {
  return text
    .replace(/&(lt|gt|quot|apos|amp);/g, (_, name) =>
      ({ lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' })[name])
    .replace(/&#(\d+);/g, (_, digits) => {
      const code = parseInt(digits, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, digits) => {
      const code = parseInt(digits, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    });
}

function decodeUtf8(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function paragraphText(paragraphInner) {
  const withBreaks = paragraphInner
    .replace(/<w:tab\b[^>]*\/>/g, ' ')
    .replace(/<w:br\b[^>]*\/>/g, '\n');
  const runs = [...withBreaks.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
  return runs.map((m) => decodeXml(m[1])).join('');
}

function headingLevel(paragraphInner) {
  const match = paragraphInner.match(/<w:pStyle\b[^>]*w:val="Heading([1-9])"/);
  return match ? parseInt(match[1], 10) : 0;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

export async function docxToChapters(input) {
  const files = await readZip(input);
  const documentBytes = files.get('word/document.xml');
  if (!documentBytes) throw new UnsupportedFormatError('Not a DOCX: word/document.xml missing');

  const coreBytes = files.get('docProps/core.xml');
  let title = 'Untitled document';
  if (coreBytes) {
    const coreTitle = decodeUtf8(coreBytes).match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    if (coreTitle && decodeXml(coreTitle[1]).trim()) title = decodeXml(coreTitle[1]).trim();
  }

  const xml = decodeUtf8(documentBytes);
  const paragraphs = [...xml.matchAll(/<w:p\b(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)].map((m) => m[1]);

  const chapters = [];
  let pendingTitle = null;
  let currentLines = [];
  const pushChapter = () => {
    if (currentLines.length === 0) return;
    const text = currentLines.join('\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) {
      currentLines = [];
      return;
    }
    chapters.push({ index: chapters.length, title: pendingTitle ?? 'Full text', text, wordCount: countWords(text) });
    pendingTitle = null;
    currentLines = [];
  };

  for (const paragraph of paragraphs) {
    if (headingLevel(paragraph) > 0) {
      pushChapter();
      const headingText = paragraphText(paragraph).trim();
      pendingTitle = pendingTitle ? `${pendingTitle} — ${headingText}` : headingText;
      continue;
    }
    const text = paragraphText(paragraph);
    if (text.trim()) currentLines.push(text);
  }
  pushChapter();
  if (pendingTitle !== null) {
    chapters.push({ index: chapters.length, title: pendingTitle, text: '', wordCount: 0 });
  }
  if (chapters.length === 0) throw new UnsupportedFormatError('No readable text found in DOCX');
  return { title, source: 'docx', chapters };
}
