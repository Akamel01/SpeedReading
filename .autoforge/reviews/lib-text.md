# Review — lib-text (`src/lib/text.js`, `test/text.test.js`)

Verdict: **CHANGES_REQUIRED**

Reviewed against plan.md §2 M2 (lines 122–128) and ADR-8 (decisions.md:49–53).
Read-only review; no code was modified.

## Test evidence (real output)

`node --test test/text.test.js` → `tests 4 | pass 4 | fail 0 | duration_ms 69.971666`, exit 0. All four existing tests green.

## Findings

### F1 — BLOCKER: long token (>14) is NOT isolated unless it starts the chunk
`src/lib/text.js:105` checks the long-word rule only at index `i`; a long token reached at `k>i` is absorbed into the running chunk.

Probe (`node --input-type=module -e`):
```
A3 long15: [{"n":2,"w":["one","abcdefghijklmno"]},{"n":1,"w":["two"]}]
```
`chunk(tokenize("one abcdefghijklmno two"), {})` puts the 15-char word with `"one"`. ADR-8 hard rule: "a token longer than 14 characters occupies its own chunk" — violated in the common case (long word not first in stream).

The existing test cannot catch this: `test/text.test.js:13–19` tokenizes `<longword> end`, so the long word is token 0 and is trivially alone; it also never asserts `words.length === 1`.

Required fix: in the range scan (`text.js:115–122`), if `tokens[k].word.length > longWordChars` then `j = (k > i ? k - 1 : k)` and stop; the long token is emitted alone on the next iteration. Add a test with a normal word before the long word asserting `ch.words.length === 1`.

### F2 — MAJOR: `size: 0` hangs forever (no validation)
No guard on `size` (`text.js:97,112`); with `size=0`, `j = Math.min(i-1, n-1) = i-1`, `slice(i, i)` is empty, and `i = j+1 = i` — infinite loop.

Probe (killed by `perl -e 'alarm 3'`, exit 142 = SIGALRM):
```
before size0
exit=142 (142=SIGALRM => hang)
```
Also `size: 2.5` → `TypeError: Cannot read properties of undefined (reading 'word')`; `size: 4` silently accepted → `[4]` (contract domain is {1,2,3}).

Required fix: since ADR-8 fixes the domain, clamp/validate: `if (!Number.isInteger(size) || size < 1 || size > 3) size = 2` (or throw). Cheapest: `j = Math.max(i, Math.min(i + size - 1, n - 1))` guards the loop even if validation is skipped.

### F3 — MAJOR: paragraph boundary missed when blank line is followed by whitespace
Boundary detection is `endsWith('\n\n')` (`text.js:118`); trailing indentation after the blank line defeats it. With no sentence punctuation at the break:

Probe:
```
A1b size3 word-lists: [["Alpha","beta","Gamma"],["delta","epsilon","zeta"]]
```
`chunk(tokenize("Alpha beta\n\n\tGamma delta epsilon zeta."), {size:3})` merges `Alpha beta` (paragraph 1) with `Gamma` (paragraph 2). ADR-8: "never merge across paragraph boundaries" — violated (size 2 survives only by luck; `B5` shows chunk text ending `"Alpha beta\n\n  "`).

Required fix: detect the break anywhere in the trail: `/\n[ \t]*\n/.test(tk.trail)` instead of `endsWith('\n\n')`.

### F4 — MEDIUM: non-ASCII letters are split into single-character tokens
`/[A-Za-z0-9]/` (`text.js:33,35`) excludes Unicode letters, so accented words fracture and chunk boundaries land mid-word.

Probe:
```
A4 toks: [{"word":"caf","trail":""},{"word":"é","trail":" "},{"word":"well","trail":""},{"word":"—","trail":""},{"word":"known","trail":" "},{"word":"na","trail":""},{"word":"ï","trail":""},{"word":"ve","trail":""}]
A4 chunks: ["café ","well—","known na","ïve"]
```
`"naïve"` is split across chunks `"known na"` / `"ïve"`; em-dash breaks `"well—known"`. Round-trip is still lossless. Real risk for EPUB/accented source text (CJK text degrades to 1-char "words").

Suggested fix: use `/\p{L}|\p{N}/u` for word continuation, treating em-dash/other punctuation under the existing fallback. Add one Unicode assertion to the test file.

### F5 — LOW: leading blank line yields a chunk whose `words` contains an empty-word token
```
A9 leading break: [{"w":[""],"t":"\n\n"},{"w":["Hello"],"t":"Hello."}]
```
No empty-`text` chunk is produced (checked: `A7 empty-text chunks: []`), and round-trip is exact, so this is only a consumer footgun (`words[0].word === ""`). Prepend/skip leading boundary tokens if UI iterates `words` for display.

## Contract checks that PASS (evidence)

- Sentence-final punctuation ends chunk, including `."`, `!?`, curly `”`: `A2 ["He said ","\"stop.\" ","Then left! ","Really? ","Yes."]`, `B1 ["Wow!? ","Next one."]`, `B2 ["He said ","“stop.” ","Next one."]`.
- Sizes: `A6 default: [2,2,2,1] s1: [1,1,1,1,1,1,1] s3: [3,3,1]` — default 2, 1 and 3 honored; options omitted works (default branch).
- 14-char word is not forced alone (rule is strictly `>14`): `A3b [["one","abcdefghijklmn"],["two"]]`.
- Round-trip: `A7 roundtrip equal: true` — `chunks.map(c=>c.text).join("") === source` for the mixed paragraph case; tokenize is lossless.
- No input mutation: deep-frozen tokens, `A8 frozen threw: null | tokens unchanged: true`.
- Empty input: `A5 empty: [] []`.
- Purity/ESM: `text.js` has zero matches for `document.`/`window.`/`fetch(`; `package.json` is exactly `{"type":"module"}`; exports are named ESM.

## Required changes before approval
1. F1 (long-word isolation) — blocker.
2. F2 (`size` validation/loop guard) — blocker for robustness; contract domain enforcement.
3. F3 (`/\n[ \t]*\n/` boundary detection) — ADR-8 "never merge across paragraph boundary".
4. F4 (Unicode word class) — recommended; at minimum document as a known limitation.
5. Tests: extend `test/text.test.js` with (a) long word preceded by a short word → `words.length === 1`, (b) indented paragraph break with `size:3` → no cross-paragraph chunk, (c) `size:0`/invalid does not hang, (d) one Unicode word case.
