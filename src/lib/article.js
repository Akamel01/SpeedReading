// Readable-article extraction from HTML (for URL imports). Regex-based so it runs
// identically in browsers and Node. Pure ESM, zero dependencies.

const ENTITY_MAP = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
  lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201c', rdquo: '\u201d',
};

function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);?/gi, (match, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return ENTITY_MAP[body.toLowerCase()] ?? match;
  });
}

function innerOf(html, tag) {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1] : null;
}

function stripChrome(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|nav|header|footer|aside|form|button|select|input|textarea|iframe|canvas|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(script|style|link|meta|noscript)\b[^>]*\/?>/gi, ' ');
}

function blocksToText(html) {
  return html
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|section|article)\s*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');
}

function cleanText(text) {
  return decodeEntities(text)
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function extractArticle(html) {
  const source = typeof html === 'string' ? html : '';
  const titleMatch = source.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1]).split(/ [|\-–—] /)[0].trim() : '';

  const cleaned = stripChrome(source);
  const candidates = [
    innerOf(cleaned, 'article'),
    cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1],
    cleaned.match(/<[^>]*role=["']main["'][^>]*>([\s\S]*?)<\/[^>]+>/i)?.[1],
  ].filter(Boolean);

  let text = '';
  for (const candidate of candidates) {
    text = cleanText(blocksToText(candidate));
    if (text.split(/\s+/).filter(Boolean).length >= 30) break;
    text = '';
  }
  if (!text) {
    const body = innerOf(cleaned, 'body') ?? cleaned.replace(/<head\b[\s\S]*?<\/head>/gi, ' ');
    text = cleanText(blocksToText(body));
  }
  return { title, text };
}
