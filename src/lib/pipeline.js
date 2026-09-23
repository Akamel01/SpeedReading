// TXT/EPUB ingestion and normalization pipeline
// ES Module - no top-level CommonJS imports

export class UnsupportedFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

// Normalize plain text for downstream processing
// - Remove BOM
// - Normalize line endings to LF
// - Collapse 3+ blank lines to 2
// - Trim trailing spaces per line
export function normalizeTxt(raw) {
  // 1) BOM
  let s = raw.replace(/^\uFEFF/, '');
  // 2) Normalize CRLF/CR to LF
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // 3) Collapse 3+ blank lines to 2, trim trailing spaces
  const lines = s.split('\n');
  const out = [];
  let blankRun = 0;
  for (const line of lines) {
    const isBlank = line.trim() === '';
    if (isBlank) {
      blankRun += 1;
      if (blankRun > 2) continue; // skip extra blanks beyond 2 in a row
    } else {
      blankRun = 0;
    }
    out.push(line.replace(/\s+$/,''));
  }
  return out.join('\n').replace(/\n+$/, '');
}

// Review fix: 'Part of this sentence continues.' must not be treated as a heading.
const TITLE_FUNCTION_WORDS = new Set([
  'of', 'in', 'at', 'on', 'to', 'by', 'with', 'for', 'from', 'is', 'are', 'was', 'were',
  'and', 'or', 'but', 'the', 'a', 'an', 'as', 'that', 'this', 'it', 'had', 'has', 'have',
]);

function isHeadingLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/^#{1,3}\s/.test(trimmed)) return true;
  if (/^§/.test(trimmed)) return true;
  const match = trimmed.match(/^(chapter|part)\b(.*)$/i);
  if (!match) return false;
  const rest = match[2].trim();
  if (rest === '') return true;
  const next = rest.split(/[\s.:\-—,]+/)[0];
  return !TITLE_FUNCTION_WORDS.has(next.toLowerCase());
}

function headingTitle(line) {
  return line.trim().replace(/^#{1,3}\s*/, '').replace(/^§\s*/, '').trim();
}

// Convert normalized text into chapter objects
// Chapter shape: { index, title, text, wordCount }
export function chapterize(text) {
  const lines = text.split('\n');
  const chapters = [];
  let pendingTitle = null;
  let currentLines = [];

  const pushChapter = () => {
    if (currentLines.length === 0) return;
    const content = currentLines.join('\n');
    const wordCount = content.trim().length === 0 ? 0 : content.trim().split(/\s+/).filter(Boolean).length;
    chapters.push({ index: chapters.length, title: pendingTitle ?? 'Full text', text: content, wordCount });
    pendingTitle = null;
    currentLines = [];
  };

  for (const line of lines) {
    if (isHeadingLine(line)) {
      pushChapter();
      const title = headingTitle(line);
      // Consecutive headings with no body merge into one title (no text loss).
      pendingTitle = pendingTitle ? `${pendingTitle} — ${title}` : title;
      continue;
    }
    currentLines.push(line);
  }

  pushChapter();

  // A trailing heading with no body still becomes a chapter (title preserved).
  if (pendingTitle !== null) {
    chapters.push({ index: chapters.length, title: pendingTitle, text: '', wordCount: 0 });
  }

  // No matches case: fallback to a single chapter
  if (chapters.length === 0) {
    const fullText = text;
    return [{ index: 0, title: 'Full text', text: fullText, wordCount: fullText.trim().split(/\s+/).filter(Boolean).length }];
  }

  return chapters;
}

// Strip Markdown formatting, keeping prose and heading text for chapter detection.
export function stripMarkdown(raw) {
  return raw
    .replace(/^---+$/gm, '')
    .replace(/^([^\n]*)\n=+[ \t]*$/gm, '$1')
    .replace(/^([^\n]*)\n-+[ \t]*$/gm, '$1')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*[ \t]*\n?|```/g, ''))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/(`{1,3})([^`]+)\1/g, '$2')
    .replace(/(\*\*|__)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/(^|[\s(>])[*_](?=\S)(.+?)(?<=\S)[*_]/g, '$1$2')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, '')
    .replace(/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/gm, '')
    .replace(/\|/g, ' ')
    .replace(/<[a-zA-Z][^>]*>/g, ' ')
    .replace(/<\/(p|div|h[1-6]|li|br|blockquote)>/gi, '\n');
}

function isModuleNotFound(err) {
  return err?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module/.test(String(err));
}

async function importOptional(path, unavailableMessage) {
  try {
    return await import(path);
  } catch (err) {
    if (isModuleNotFound(err)) throw new UnsupportedFormatError(unavailableMessage);
    throw err;
  }
}

// Ingest a file given name and ArrayBuffer
// Supported: .txt/.md (utf-8) and .epub/.docx/.pdf (dynamic load)
export async function ingest({ name, arrayBuffer }) {
  const title = name.replace(/\.[^.]+$/, '');
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';

  if (ext === 'txt' || ext === 'md') {
    const decoder = new TextDecoder('utf-8');
    const raw = decoder.decode(arrayBuffer);
    const normalized = normalizeTxt(ext === 'md' ? stripMarkdown(raw) : raw);
    const chapters = chapterize(normalized);
    return { title, source: ext, chapters };
  }

  if (ext === 'epub') {
    const mod = await importOptional('./epub.js', 'EPUB support unavailable');
    const book = await mod.epubToChapters(arrayBuffer);
    return { title: book.title || title, source: 'epub', chapters: book.chapters };
  }

  if (ext === 'docx') {
    const mod = await importOptional('./docx.js', 'DOCX support unavailable');
    const book = await mod.docxToChapters(arrayBuffer);
    return { title: book.title && book.title !== 'Untitled document' ? book.title : title, source: 'docx', chapters: book.chapters };
  }

  if (ext === 'pdf') {
    const mod = await importOptional('./pdf.js', 'PDF support unavailable');
    const book = await mod.pdfToChapters(arrayBuffer, { filename: name });
    return { title: book.title || title, source: 'pdf', chapters: book.chapters };
  }

  throw new UnsupportedFormatError(`Unsupported file type: ${ext || '(none)'}. Supported: .txt, .md, .epub, .docx, .pdf`);
}
