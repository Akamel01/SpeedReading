# Review M-RB1 — splitSentences + sessionTicks

- Verdict: **APPROVED_WITH_NOTES**
- Date: 2026-09-23 · Reviewer: autoforge-reviewer (read-only)
- Reviewed revision: working tree (uncommitted), shasums:
  - `src/lib/text.js` `26ce3b8cad603f33baa402acdefb8df17797bee1`
  - `src/lib/metrics.js` `62cc36a0b977280f67fc1f88a97345d1d33026c4`
  - `test/text.test.js` `3ae362d8ab4ad1f22bdb2b0acb097d76417219a9`
  - `test/metrics.test.js` `6f8bab90d0394d22de3cc33b40f89422be8cc3b6`
- Note: all four files show ` M` in `git status` — reviewed as working tree, not committed.

## Evidence

### 1. Test runs (real output)

```
$ node --test test/text.test.js
ℹ tests 14   ℹ pass 14   ℹ fail 0
$ node --test test/metrics.test.js
ℹ tests 11   ℹ pass 11   ℹ fail 0
$ node --test test/text.test.js test/metrics.test.js
ℹ tests 25   ℹ pass 25   ℹ fail 0
$ node --test
ℹ tests 103  ℹ pass 103  ℹ fail 0
```

Full-suite expectation 103/103 met.

### 2. Contract §8 conformance (quoted code)

`splitSentences(text) -> string[]`, `'' -> []` — `src/lib/text.js:86-87`:

```js
export function splitSentences(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
```

Abbreviation-aware: set at `text.js:88-90` (`'mr.', 'mrs.', 'ms.', 'dr.', 'st.', 'prof.', 'sr.', 'jr.', 'no.', 'fig.', 'i.e.', 'e.g.'`), whole-word match + initialism guard at `text.js:116-124`:

```js
const tail = text.slice(start, i + 1);
const lastWord = tail.match(/([A-Za-z][A-Za-z.]*)$/);
const word = lastWord ? lastWord[1] : '';
const endsWithAbbreviation = abbreviations.has(word.toLowerCase());
const endsWithInitialism = /^([A-Za-z]\.){2,}$/.test(word);
if ((endsWithAbbreviation || endsWithInitialism) && !atEnd) { i = end; continue; }
```

`sessionTicks -> [{wpm, comprehensionPct, best}]`, best = argmax wpm first-on-tie, no mutation, missing pct -> null — `src/lib/metrics.js:71-85`:

```js
export function sessionTicks(sessions) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];
  const out = sessions.map((s) => ({ wpm: s?.wpm,
    comprehensionPct: s && typeof s?.comprehensionPct === 'number' ? s.comprehensionPct : null,
    best: false }));
  const wpmValues = out.map((o) => o.wpm);
  const maxWpm = Math.max(...wpmValues.filter((v) => typeof v === 'number'));
  if (!Number.isFinite(maxWpm)) return out;
  const firstIndex = wpmValues.indexOf(maxWpm);
  if (firstIndex >= 0) out[firstIndex].best = true;
  return out;
}
```

`.map` allocates fresh objects (no input mutation); `indexOf` gives first-on-tie.

### 3. Adversarial probes (real output)

```
"He said Dr. Smith left." -> ["He said Dr. Smith left."]            # no split at Dr.
"It cost 3.5 dollars. Then more." -> ["It cost 3.5 dollars.","Then more."]  # no split at 3.5
"(Hello.) Next." -> ["(Hello.)","Next."]                            # boundary after paren
"No punctuation at all" -> ["No punctuation at all"]                # 1 item
"   " -> []
"He said \"Stop.\" Then ran." -> ["He said \"Stop.\"","Then ran."]  # closing-quote absorbed
"Wait... what?" -> ["Wait...","what?"]
"Hi.  \n\n  Next." -> ["Hi.","Next."]
```

sessionTicks probes:

```
[{wpm:100,comprehensionPct:80},{wpm:150},{wpm:150,comprehensionPct:90}]
 -> [{"wpm":100,"comprehensionPct":80,"best":false},
     {"wpm":150,"comprehensionPct":null,"best":true},
     {"wpm":150,"comprehensionPct":90,"best":false}]   # tie -> first
sessionTicks([]) -> [] ; sessionTicks(null) -> []
frozen([{wpm:80,comprehensionPct:60},{wpm:90}])
 -> [{"wpm":80,"comprehensionPct":60,"best":false},{"wpm":90,"comprehensionPct":null,"best":true}] ; mutated: false
[{comprehensionPct:50},{wpm:120,comprehensionPct:0}]
 -> [{"comprehensionPct":50,"best":false},{"wpm":120,"comprehensionPct":0,"best":true}]
```

### 4. Abbreviation-guard semantics (challenge)

```
"U.S.A. wins!" -> ["U.S.A. wins!"]      # initialism guard prevents split after "A."
"E.g. this works." -> ["E.g. this works."]
"I saw J.R. He left." -> ["I saw J.R. He left."]   # false MERGE
"Ends with Dr.  Next." -> ["Ends with Dr.  Next."] # false MERGE
"..." -> ["..."]
```

Reasoning: both failure modes are merges, not fragments — an SR display item is longer than the source sentence but never a mid-word/mid-clause shard. For sentence-at-a-time reading, over-merge is the benign direction (a shard like `"Dr."` shown alone would be worse), the patterns are rare in prose (`e.g.` / `U.S.A.` sentence-terminally, a genuine sentence ending in `Dr.`/`J.R.`), and the guard is unconditional only mid-text (`!atEnd`), so EOF still splits. Trade-offs acceptable for SR-mode display. `"..."` yields a punctuation-only item — cosmetic, harmless.

## Findings

1. **[note] False-merge on initialism at a real sentence end** — `"I saw J.R. He left."` -> one item. Documented trade-off (`text.js:114-115`), benign direction for SR display. No change required.
2. **[note] Sentence genuinely ending in a known abbreviation merges with the next** — `"Ends with Dr.  Next."` -> one item. Same trade-off; rare; acceptable.
3. **[note] Tests cover the happy paths but not the guard's failure modes** — no test asserts the documented merge behavior (e.g. `J.R.`), so a future "fix" could flip semantics silently. Add one assertion when the file is next touched; not blocking.
4. **[info] Degenerate sessionTicks inputs** — non-numeric/absent `wpm` is preserved as-is (`undefined`/`NaN`) in output; all `best:false` when no numeric wpm. Outside contract (records are `{wpm:number}`); no crash, no mutation.
5. **[info] Uncommitted working tree** — all four files modified vs `d35a78c`; reviewed revision is the working tree hashes above.

## Verdict rationale

Contract §8 signatures, semantics (`'' -> []`, tie-first argmax, null pct, purity) verified against real runs; focused suites 25/25 and full suite 103/103 green; adversarial probes reproduce the intended abbreviation/decimal/paren behavior. Remaining items are documented trade-offs and test-coverage notes, not defects. **APPROVED_WITH_NOTES.**
