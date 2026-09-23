// Minimal PDF text extractor on top of vendored pdf.js. Pure ESM; the only dependency
// is the vendored build (loaded by dynamic import so non-PDF paths never load it).
// Contract: pdfToChapters(ArrayBuffer|Uint8Array, {filename}) -> Promise<{title, source:'pdf', chapters:[{index,title,text,wordCount}]}>

export class UnsupportedFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsupportedFormatError';
  }
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

// Pure page-grouping used by pdfToChapters and directly by tests.
export function groupPagesToChapters(pages, boundaries) {
  const sorted = [...boundaries].sort((a, b) => a.pageIndex - b.pageIndex);
  const chapters = [];
  if (sorted.length === 0) {
    const text = pages.map((p) => p.text).filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    if (!text) return [];
    return [{ index: 0, title: 'Full text', text, wordCount: countWords(text) }];
  }
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i].pageIndex;
    const end = i + 1 < sorted.length ? sorted[i + 1].pageIndex : pages.length;
    const text = pages
      .slice(Math.max(0, start), Math.max(0, end))
      .map((p) => p.text)
      .filter(Boolean)
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    if (!text) continue;
    chapters.push({ index: chapters.length, title: sorted[i].title || `Pages ${start + 1}–${end}`, text, wordCount: countWords(text) });
  }
  return chapters;
}

export async function pdfToChapters(input, { filename } = {}) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const pdfjs = await import('../../vendor/pdfjs/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('../../vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;

  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: bytes, useSystemFonts: true }).promise;
  } catch (error) {
    if (error?.name === 'PasswordException') {
      throw new UnsupportedFormatError('Encrypted PDFs are not supported');
    }
    throw new UnsupportedFormatError(`Could not read PDF: ${error?.message ?? error}`);
  }

  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) {
      text += item.str ?? '';
      if (item.hasEOL) text += '\n';
      else if (text && !text.endsWith(' ') && !text.endsWith('\n')) text += ' ';
    }
    pages.push({ index: pageNumber - 1, text: text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim() });
  }

  let boundaries = [];
  try {
    const outline = await pdf.getOutline();
    if (outline) {
      for (const entry of outline) {
        if (!entry?.dest) continue;
        const dest = await pdf.getDestination(entry.dest);
        if (!dest?.length) continue;
        const pageIndex = await pdf.getPageIndex(dest[0]);
        boundaries.push({ pageIndex, title: String(entry.title ?? '').trim() });
      }
    }
  } catch {
    boundaries = [];
  }

  const chapters = groupPagesToChapters(
    pages,
    boundaries.filter((b) => b.title && Number.isInteger(b.pageIndex) && b.pageIndex >= 0 && b.pageIndex < pages.length),
  );
  if (chapters.length === 0) {
    throw new UnsupportedFormatError('No readable text found in PDF (scanned-image PDFs need OCR)');
  }

  let title = filename ? filename.replace(/\.[^.]+$/, '') : 'Untitled PDF';
  try {
    const metadata = await pdf.getMetadata();
    const infoTitle = metadata?.info?.Title;
    if (typeof infoTitle === 'string' && infoTitle.trim()) title = infoTitle.trim();
  } catch {
    /* keep filename fallback */
  }
  return { title, source: 'pdf', chapters };
}
