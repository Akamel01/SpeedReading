# Review r2 — lib-text (`src/lib/text.js`, `test/text.test.js`)

Verdict: **APPROVED_WITH_NOTES**

Re-review after CHANGES_REQUIRED (prior: `.autoforge/reviews/lib-text.md`, findings F1–F5).
Read-only; no code modified. Artifact SHA: `dd528d9806862e5e73d4c20b8c5a72e7a6d5a2be  src/lib/text.js`.

## Test evidence (real output)

`node --test test/text.test.js`:
```
ℹ tests 9 | ℹ pass 9 | ℹ fail 0 | ℹ cancelled 0 | ℹ skipped 0 | ℹ duration_ms 67.612625
```
(9 includes all five reviewer-fix regression tests: long word mid-chunk, invalid size, indented blank line, unicode, leading blank lines.)

Full suite `node --test`:
```
ℹ tests 75 | ℹ pass 75 | ℹ fail 0 | ℹ duration_ms 192.804583
```

## Probe re-runs (exact outputs)

```
P1 (long word mid-chunk, size 2): [{"n":1,"text":"one "},{"n":1,"text":"abcdefghijklmno "},{"n":1,"text":"two"}]
P2 (indented blank line, size 3): ["Alpha\n   \n","beta gamma delta"]
P3 (size 0): RangeError | chunk size must be an integer in {1,2,3}, got 0 | elapsed 0 ms
P4 (unicode): ["naïve","café"]
P5 (leading blank lines): ["Hi"]
```

Prior findings status:
- F1 long-word isolation (BLOCKER): FIXED — `text.js:112–118` scans `k∈[i,j]` and cuts `j = k>i ? k-1 : k`; P1 isolates the 15-char word. Test asserts `words.length === 1` (`test/text.test.js:36–42`).
- F2 `size:0` hang (BLOCKER): FIXED — `text.js:98–104` validates `size ∈ {1,2,3}` and `longWordChars ≥ 1` before the loop; throws `RangeError` in 0 ms. `size:-1`, `1.5`, `4`, `longWordChars:0` all `RangeError`.
- F3 indented blank line (MAJOR): FIXED — `text.js:123` `/\n[^\S\n]*\n/` searched across the trail; P2 first chunk is `"Alpha\n   \n"` only. CRLF variant also works: `["A\r\n\r\n","B"]`.
- F4 unicode words (MEDIUM): FIXED — `text.js:33,35` `\p{L}\p{N}\p{M}`; P4 output; combining mark `e\u0301tude` → `["e\u0301tude","日本語"]` (single tokens).
- F5 empty leading chunk (LOW): FIXED — `text.js:139–142` skips all-empty-word runs; `tokenize('\n\n')` → `[]`, `tokenize('\n\nHi')` → exactly one `"Hi"` chunk.

## New-defect check (long-word loop `j = k-1` when `k==i`)

No empty chunk possible: `k>i ⇒ j=k-1 ≥ i`; `k==i ⇒ j=k=i`; `chunkTokens` is never empty and `i` strictly advances. Verified:
```
P6a "a abcdefghijklmno": [{"n":1,"text":"a "},{"n":1,"text":"abcdefghijklmno"}]
P6b lone long word:     [{"n":1,"text":"abcdefghijklmno"}]
P7 adjacent long words: [{"n":1,"text":"abcdefghijklmno "},{"n":1,"text":"abcdefghijklmnp"}]
stress (5003 words + long): 1669 chunks, last "tail", terminates
```
Other checks: round-trip `ch.map(c=>c.text).join('') === src` true on mixed text; no mutation of frozen tokens; empty input `[]`; boundary token mid-range `["A\n\n","B C"]` (size 3); 14-char word not isolated, 15-char isolated (strict `>14` preserved); omitted options still default size 2.

## Notes (non-blocking)

1. `word.length` counts UTF-16 code units, not code points — an astral-plane letter (CJK extension, rare scripts) counts 2, so a borderline word could be over-counted for `longWordChars`. No split/merge correctness impact; only isolation threshold precision.
2. Em-dash remains a fallback single-char token (`"well—known"` → `well`, `—`, `known`), so a chunk boundary can land on the dash. Pre-existing behavior, accepted in prior review; punctuation is preserved losslessly.
3. Tests added for all five fixes are meaningful (assert content/length, not just no-throw). One nit: `test/text.test.js:13–19` still only covers long-word-first case, but the new mid-chunk test (line 36) covers the real regression.

## Verdict rationale

All four required fixes (plus F4/F5) land with regression tests; 9/9 module tests and 75/75 full suite pass; probe re-runs match expectations; no new defect found in the long-word or validation paths. Mergeable; notes are informational only.
