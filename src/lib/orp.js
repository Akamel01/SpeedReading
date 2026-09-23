// ORP (Optimal Recognition Point) — single source of truth for ORP constants.
// Pure ESM module: no DOM, no imports.

export function orpIndex(word) {
  if (typeof word !== 'string') throw new TypeError('orpIndex expects a string');
  if (word.length === 0) throw new TypeError('orpIndex expects a non-empty string');

  const len = word.length;
  let idx;
  if (len === 1) idx = 0;
  else if (len <= 5) idx = 1;
  else if (len <= 9) idx = 2;
  else if (len <= 13) idx = 3;
  else idx = 4;

  if (idx > len - 1) idx = len - 1;
  return idx;
}

export function orpParts(word) {
  if (typeof word !== 'string') throw new TypeError('orpParts expects a string');
  if (word.length === 0) throw new TypeError('orpParts expects a non-empty string');

  const index = orpIndex(word);
  return {
    left: word.slice(0, index),
    orp: word.slice(index, index + 1),
    right: word.slice(index + 1),
  };
}
