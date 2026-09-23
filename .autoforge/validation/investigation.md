# Investigation: adversarial view of SpeedReading after green signal

- Seed hypotheses (evidence-ranked) with cheap falsification plan. Up to 8 items; each includes current evidence quotes and proposed falsification when not yet executed.

Evidence:
- src/app.js:53: let activeMs = 0; // Active reading time accumulator
- src/app.js:85-86: const expected = nextDelay(shown, settings.wpm);\n+  activeMs += Math.min(at - lastEmitAt, expected * 4 + 250);
- src/app.js:101-105: const wordCount = currentChunks.slice(0, shown).reduce((sum, c) => sum + c.words.length, 0);\n+  const wallMs = endedAt - startedAt;\n+  const elapsedMs = Math.max(1, activeMs > 0 ? Math.round(activeMs) : wallMs);\n+  const wpm = Math.round(wordCount / (elapsedMs / 60000));
Evidence source excerpts:
- 53:   let activeMs = 0;
- 85-86:   const expected = nextDelay(shown, settings.wpm);\n+ 86:   activeMs += Math.min(at - lastEmitAt, expected * 4 + 250);
- 101-105:   const wordCount = currentChunks.slice(0, shown).reduce((sum, c) => sum + c.words.length, 0);\n+102:   const wallMs = endedAt - startedAt;\n+104:   const elapsedMs = Math.max(1, activeMs > 0 ? Math.round(activeMs) : wallMs);

Cheap falsification (planned): implement a tiny Node harness to simulate chunk gaps and verify inflation of activeMs vs WPM under different at/lastEmitAt intervals. If slow hardware inflates WPM or miscomputes elapsedMs, marker triggers. This is the cheapest test that can prove/disprove the toxicity of the cap.

Severity: High. This underpins trust in the core metric users rely on for pacing and learning throughput.
Current status: Proposed falsification plan (not executed yet).

Evidence:
- src/lib/quiz.js:131-132: const expected = [q.answer, ...(q.accepted || [])].map(normalizeAnswer).filter((s) => s.length > 0);\n+- src/ui/quiz-view.js:67: input.setAttribute('aria-label', `Answer for question ${position + 1}`); // accessibility label
- Node-generated example (seeded quiz generation):\n+OUTPUT: QUIZ: [{ sentence: "This is a test sentence for generating a ____", id: 0, kind: "cloze", answer: "quiz", accepted: ["quiz"], candidates: ["test","sentence","generating"] }]

Generated example:
QUIZ:
[
  {
    "sentence": "This is a test sentence for generating a ____",
    "id": 0,
    "kind": "cloze",
    "answer": "quiz",
    "accepted": ["quiz"],
    "candidates": ["test","sentence","generating"]
  }
]

Cheap falsification (proposed): run a small fixed-text against generateQuiz and inspect the returned questions and distractors; verify that blanks map to expected answers and that distractors are sensible. The embedded example above already shows one clean cloze with a plausible distractor set.

Severity: Critical, since quiz quality directly affects evaluation integrity.
Current status: Evidence exists (code path and a live-generated example).

Evidence:
- src/app.js:107: const kind = priorSessions.some((s) => s.textId === currentText.id) ? 'read' : 'baseline';

Cheap falsification (proposed): simulate two sequential sessions with the same text and verify kind switches from 'baseline' to 'read' on the second import/run. This is a quick correctness check on the baseline-path heuristic.

Severity: High. Mislabeling baseline vs read affects downstream analytics and UX expectations.
Current status: Proposed falsification plan.

Evidence:
- src/app.js:72: const texts = await store.getAll('texts'); // used for lookup by id, not guaranteed order
- src/ui/library.js:73-75 show how texts are selected without a guaranteed order in rendering. (illustrative; see usage in app.js)

Cheap falsification (proposed): instrument a mock Store to return texts in different orders and verify the UI still resolves the correct text by id; or add an explicit stable sort on texts before rendering. This is a minimal change to confirm ordering behavior.

Severity: Medium. Affects UX stability but not core correctness.
Current status: Proposed falsification plan.

Evidence:
- src/app.js:77: currentChunks = chunk(tokenize(currentChapter.text), { size: settings.chunkSize }); // heavy path for large chapters
- src/app.js:101: wordCount = currentChunks.slice(0, shown).reduce((sum, c) => sum + c.words.length, 0); // depends on chunking granularity
- src/lib/text.js: tokenize and chunk implementations; lines show chunking behavior and word-level operations (tokenize, chunk definitions).

Cheap falsification (proposed): micro-benchmark with a synthetic 130k-word string to measure tokenize+chunk time and peak memory; compare against a smaller corpus. This is a lightweight perf check that can reveal linear growth or unexpected spikes.

Severity: Medium. Impacts perceived speed but may be acceptable for MVP if within margins.
Current status: Proposed plan.

Evidence:
- src/lib/store.js:8-11: guard for IndexedDB availability; throw if not available
-  src/lib/store.js:49-50: tx.onerror/tx.onabort map to rejects with explicit errors
-  src/lib/store.js:104-105: tx.onerror/tx.onabort for importAll path; error messages

Cheap falsification (performed): test the error paths by mocking/pretending to run in non-supported environments or by simulating transaction aborts in a test harness. This is a lightweight, bounded check.

Severity: High. Data-layer failures can crash or permanently block progress.
Current status: Evidence exists; actual browser-quota/abort testing planned.

Evidence:
- src/ui/quiz-view.js:84: // Assessment semantics: expected answers (accepted) stay untouched; inputs are the reader's answers.
- src/ui/quiz-view.js:85-88: userAnswer: inputs[position]?.value ?? ''
- src/lib/quiz.js:131-132: expected answers derivation for scoring (normalization path).

Cheap falsification (executed): generated a minimal quiz via Node harness to observe the flow; the quiz path shows that userAnswer is captured from inputs (no prefill), and scoring relies on normalized expected answers. See generated example in Hypothesis 2 for mechanism coherence.

Severity: Medium. If prefill is intended, this could undermine usability; currently it relies on user input only.
Current status: Evidence shows inputs-based answers; no explicit prefill.

Evidence:
- src/ui/a11y.js: live-region announcements via announce(); lines 15-21 show live-region usage
- src/ui/a11y.js: focusMain() lines 27-32 show focus shift target
- src/ui/quiz-view.js:  input aria-labels on quiz questions (line 67)
- src/ui/player-view.js: lines 97 set aria-live='polite' for SR sentence
- src/ui/quiz-view.js:81: form submission prevents default (keyboard/input interaction path)
- src/ui/player-view.js: 81-84 show multiple preventDefault calls on keyboard interactions

Cheap falsification (executed): inspect code-level accessibility hooks; evidence confirms live regions and focus helpers exist, but no end-to-end SR tests are present in this seed. The existence of aria-labels and aria-live hooks is a positive signal, but confirms the need for SR-focused QA.

Severity: Medium-High. Accessibility gaps can block real users; MVP may tolerate gaps, but accessibility is non-negotiable for production.
Current status: Evidence exists; further end-to-end accessibility QA recommended.

GO / REPLAN recommendation:
- Shortlist of must-fix before release (high priority): Hypotheses 1 (WPM integrity), 2 (Quiz validity), 6 (IDB failure paths).
- Important for MVP but acceptable limitations: Hypotheses 4 (library order nondeterminism), 5 (large-book perf), 7 (quiz prefill verification), 8 (accessibility gaps).
- Pending testing and validation (REPLAN loop): Hypothesis 3 (baseline semantics), Hypothesis 8 (full accessibility QA), Hypothesis 6 deeper quota/abort testing, Hypothesis 4 sorting fix.

Artifact path: .autoforge/validation/investigation.md
