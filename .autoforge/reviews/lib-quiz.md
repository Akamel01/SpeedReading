# Review — M4 `lib-quiz`

Reviewer: autoforge-reviewer (independent; execution report not trusted).
Date: 2026-09-22. Read-only review; no source edits.
Files reviewed: `src/lib/quiz.js`, `test/quiz.test.js`, `.autoforge/plans/plan.md` §1/§2 M4.

## Verdict

**APPROVED_WITH_NOTES**

Module acceptance (plan §2 M4) passes on current files; no crash on in-contract
adversarial inputs; determinism verified independently. Notes below are real
behavior deviations worth a follow-up ticket but do not block acceptance:
`scoreQuiz` ignores `accepted`, stopword filtering is case-sensitive, and the
repo-wide `node --test` run has 19 failures in `test/orp.test.js` (different
module — not caused by this change, but the repo is not green).

## Evidence

### 1. Module test run

`node --test test/quiz.test.js`:

```
✔ same seed produces identical quizzes (1.959167ms)
✔ different seeds produce different quizzes (0.232875ms)
✔ generateQuiz returns n=5 cloze questions with blanked answers (0.256584ms)
✔ normalizeAnswer handles case, punctuation, whitespace (0.190209ms)
✔ scoreQuiz scores with tolerance and returns perQuestion (0.115292ms)
✔ scoreQuiz with zero questions yields pct 0 (not NaN) (0.066458ms)
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

### 2. Independent determinism probe (own script, not the test file)

`node --input-type=module -e '...'` against `src/lib/quiz.js`:

```
same-seed run1==run2: true run1==run3: true
seed5==seed6: false
seed5: [{"sentence":"Reading ____ requires practice and attention every single day","id":0,"kind":"cloze","answer":"quickly","accepted":["quickly"],"candidates":["reading","requires","practice","attention"]}, ...]
seed6: [{"sentence":"Reading quickly requires practice and attention every single ____","id":0,"kind":"cloze","answer":"day","accepted":["day"],"candidates":["reading","quickly","requires","practice"]}, ...]
```

Deterministic per seed across repeated runs; different seeds differ. Contract satisfied.

### 3. Adversarial probes (own script)

```
empty text: []
stopwords-only ("the and or a an in of to"): [{"sentence":"____ and or a an in of to","id":0,"kind":"cloze","answer":"the","accepted":["the"],"candidates":[]}]
one-word text ("Hello."): []
41-word sentence default (maxSentenceWords=40): 0
41-word sentence maxOverride=50: 1
n:0: []
n:99 available (2 sentence doc): 2
answers shorter ([{answer:"a"},{answer:"b"}], ["a"]): {"correct":1,"total":2,"pct":50,"perQuestion":[true,false]}
```

No crash in any in-contract input. `n` respected; `n<=available` holds; missing
answer rows score false (no crash); empty/one-word text returns `[]`.

### 4. `stopWords.has(core)` case sensitivity

Probe: seeds 1..40 over `"The astronomer discovered distant galaxies quietly."`, count sentences starting with blank:

```
seeds 1..40 blanked leading The: 5 {"seed":8,"sentence":"____ astronomer discovered distant galaxies quietly","answer":"the"}
```

`src/lib/quiz.js:64` `if (stopWords.has(core)) continue;` compares raw `core`
without lowercasing, while `src/lib/quiz.js:87` does
`const answer = core.toLowerCase();`. Capitalized/uppercase stopwords
("The", "And", "For") are therefore treated as content words and can be
blanked, and they leak into `candidates` (distractors) at
`src/lib/quiz.js:99`. Contract says "blanks a content word".

### 5. Full suite

`node --test` (all tests):

```
ℹ tests 50
ℹ pass 31
ℹ fail 19
✖ failing tests:
✖ orpIndex length 1 ... ✖ orpParts concatenation identity ... ✖ TypeError cases for non-string and empty
```

All 19 failures are in `test/orp.test.js` (M3 `lib-orp`). None in
`test/quiz.test.js`; all 6 quiz tests pass inside the full run. No lib-quiz
regression, but the repository suite is not green.

## Findings

1. **[Note] `scoreQuiz` ignores `q.accepted`** — `src/lib/quiz.js:130` compares only `normalizeAnswer(q.answer)`; the `accepted[]` field on the frozen Question type is never read. Probe: `scoreQuiz([{answer:"practice",accepted:["practice","training"]}],["training"])` returns `{"correct":0,...,"perQuestion":[false]}`. The review contract says tolerance is "via accepted/normalized compare". No plan acceptance test covers this, so it passes M4, but `ui-quiz-view` users editing to a synonym would be scored wrong. Fix: score `true` if the normalized answer matches any normalized entry of `[q.answer, ...(q.accepted||[])]`.

2. **[Note] Stopword filter is case-sensitive; "The" gets blanked** — `src/lib/quiz.js:64`; probe in §4 (5/40 seeds blanked leading "The", answer `"the"`). Also lets capitalized stopwords into generated distractors (`src/lib/quiz.js:99`). Fix: compare `stopWords.has(core.toLowerCase())` in both places (or lowercase `core` once).

3. **[Note] No-content-word fallback blanks a stopword** — `src/lib/quiz.js:68-73`: for a sentence with only stopwords, output is `{"sentence":"____ and or a an in of to","answer":"the",...}`. Contract wording says the blank is a content word; code deliberately falls back to any word. Non-crashing and arguably the right call for degenerate input, but the generated question is low quality and the fallback is undocumented in the contract. Either document it or filter such sentences out of `filtered`.

4. **[Note] Duplicate words make the answer its own distractor** — `src/lib/quiz.js:93-102` excludes only index `i === pick`; with repeated tokens: `generateQuiz("word word word word word word word word word",{n:1,seed:2,minSentenceWords:1})` gives `{"answer":"word","candidates":["word"]}`. Fix: skip `wcore.toLowerCase() === answer` when building `distractSet`.

5. **[Note] `seed: 0` silently aliases `seed: 1`** — `src/lib/quiz.js:9` `let s = (seed >>> 0) || 1;`. Probe: `seed0==seed1: true`. Determinism claim still true per seed, but distinct seeds collide at 0/1; if callers randomize with `Math.floor(Math.random()*N)`, 0 and 1 are indistinguishable. Either acceptable-by-design (document) or map 0 to a distinct nonzero constant.

6. **[Blocker outside this module] Repo suite not green** — 19/50 fail, all in `test/orp.test.js` (M3). Not attributable to `lib-quiz` (quiz tests pass in isolation and in the full run) but blocks the M14-wide "`node --test test/` all green" gate. Route to the orp module's owner.

## Checked and passing

- Determinism across repeated runs and across two seeds (§2).
- `normalizeAnswer` case/trim/punctuation/whitespace (`'hello, world'` keeps internal punctuation; `'“Speed.”'` -> `'speed'`; `null` -> `''`).
- `scoreQuiz` empty input -> `{correct:0,total:0,pct:0,perQuestion:[]}`, `pct` is `0` not `NaN`.
- `n:0`, `n>available`, empty text, one-word text, short answer arrays: no crash, contract-consistent results.
- `minSentenceWords=8`/`maxSentenceWords=40` respected (41-word sentence excluded by default, included with override).
- Module has no DOM/network access at import time (plan §1c.1) — pure functions only.
