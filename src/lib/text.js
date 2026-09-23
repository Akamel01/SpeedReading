// lib/text.js
// Tokenize and chunk text according to ADR-8 rules.
// Token: { word: string, trail: string }

export function tokenize(text) {
  const tokens = [];
  const len = text.length;
  let i = 0;

  const isWhitespace = (ch) => /\s/.test(ch);
  const push = (word, trail) => tokens.push({ word, trail: trail || "" });

  while (i < len) {
    // Paragraph boundary: blank line -> a boundary token with a trailing newline gap
    if (text[i] === '\n' && text[i + 1] === '\n') {
      push("", "\n\n");
      i += 2;
      continue;
    }
    // Simple whitespace handling: attach to previous token's trail if present
    if (isWhitespace(text[i])) {
      if (tokens.length > 0) {
        tokens[tokens.length - 1].trail += text[i];
      } else {
        push("", text[i]);
      }
      i++;
      continue;
    }

    const ch = text[i];
    // Word token: unicode letters/digits/marks (reviewer: non-ASCII words must not split)
    if (/[\p{L}\p{N}\p{M}]/u.test(ch)) {
      let j = i;
      while (j < len && /[\p{L}\p{N}\p{M}]/u.test(text[j])) j++;
      const word = text.slice(i, j);
      i = j;

      // Trailing punctuation immediately after the word (sentence punctuation)
      let trail = "";
      while (i < len && /[.!?]/.test(text[i])) {
        trail += text[i];
        i++;
      }
      // Optional closing quotes after punctuation
      while (i < len && /["'”’`]/.test(text[i])) {
        trail += text[i];
        i++;
      }
      // Trailing whitespace after punctuation/word
      while (i < len && /\s/.test(text[i])) {
        trail += text[i];
        i++;
      }
      push(word, trail);
      continue;
    }

    // Fallback: standalone punctuation or other character
    if (/[.!?]/.test(ch)) {
      let trail = "";
      i++;
      // trailing quotes after punctuation
      while (i < len && /["'”’`]/.test(text[i])) {
        trail += text[i];
        i++;
      }
      // trailing whitespace
      while (i < len && /\s/.test(text[i])) {
        trail += text[i];
        i++;
      }
      push(ch, trail);
      continue;
    }

    // Unknown/other character: treat as a single-token element
    push(ch, "");
    i++;
  }

  return tokens;
}

function endsSentencePunctuationTrail(trail) {
  if (!trail) return false;
  // Strip trailing whitespace
  let t = trail.replace(/\s+$/g, "");
  // Strip trailing quotes if present
  t = t.replace(/["'”’`]+$/g, "");
  if (t.length === 0) return false;
  const last = t[t.length - 1];
  return last === '.' || last === '!' || last === '?';
}

export function chunk(tokens, options) {
  const size = options && options.size !== undefined ? options.size : 2;
  if (!Number.isInteger(size) || size < 1 || size > 3) {
    throw new RangeError(`chunk size must be an integer in {1,2,3}, got ${String(size)}`);
  }
  const longWordChars = options && options.longWordChars !== undefined ? options.longWordChars : 14;
  if (!Number.isInteger(longWordChars) || longWordChars < 1) {
    throw new RangeError(`longWordChars must be a positive integer, got ${String(longWordChars)}`);
  }
  const chunks = [];
  const n = tokens.length;
  let i = 0;
  while (i < n) {
    let j = Math.min(i + size - 1, n - 1);

    // Review fix: long words must be isolated even when they land mid-chunk.
    for (let k = i; k <= j; k++) {
      const tk = tokens[k];
      if (tk.word && tk.word.length > longWordChars) {
        j = k > i ? k - 1 : k;
        break;
      }
    }

    // Respect paragraph boundary: two newlines possibly separated by indentation.
    for (let k = i; k <= j; k++) {
      const tk = tokens[k];
      if (typeof tk.trail === 'string' && /\n[^\S\n]*\n/.test(tk.trail)) {
        j = k;
        break;
      }
    }

    // End at first sentence-ending punctuation within the range
    for (let k = i; k <= j; k++) {
      if (endsSentencePunctuationTrail(tokens[k].trail)) {
        j = k;
        break;
      }
    }

    const chunkTokens = tokens.slice(i, j + 1);
    // Skip pure-whitespace/boundary runs (e.g. leading blank lines) — no empty chunks.
    if (chunkTokens.every((tk) => tk.word === '')) {
      i = j + 1;
      continue;
    }
    const text = chunkTokens.map((tk) => (tk.word + (tk.trail || ''))).join('');
    chunks.push({ words: chunkTokens, text });
    i = j + 1;
  }
  return chunks;
}

// Named exports allow ES module imports in the test environment
