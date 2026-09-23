// lib/quiz.js
// Seeded cloze quiz generator with tolerant scoring
// - generateQuiz(text, {n, seed, minSentenceWords, maxSentenceWords}) -> Question[]
// - scoreQuiz(questions, answers) -> {correct, total, pct, perQuestion}
// - normalizeAnswer(s) -> string

// Lightweight seeded RNG (LCG) for determinism without deps
function createSeededRNG(seed) {
  let s = (seed >>> 0) || 1;
  return function rnd() {
    // Parameters chosen to be fast and reasonably distributed
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function normalizeAnswer(s) {
  if (s == null) return "";
  let t = String(s).toLowerCase().trim();
  // strip surrounding non-alphanumeric chars
  t = t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  // collapse whitespace
  t = t.replace(/\s+/g, " ");
  return t;
}

export function generateQuiz(text, { n = 5, seed = 1, minSentenceWords = 8, maxSentenceWords = 40 } = {}) {
  const sentences = (text || "").split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  // filter by word count
  const filtered = sentences.filter(s => {
    const wc = s.trim().split(/\s+/).filter(w => w.length > 0).length;
    return wc >= minSentenceWords && wc <= maxSentenceWords;
  });
  const available = filtered.length;
  const count = Math.min(n, available);
  const rng = createSeededRNG(seed);
  // If not enough sentences, return as many as we can
  // Shuffle indices deterministically and take first `count`
  const indices = filtered.map((_, i) => i);
  // Fisher-Yates-like partial shuffle using RNG
  for (let i = 0; i < indices.length && i < count; i++) {
    const j = i + Math.floor(rng() * (indices.length - i));
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  // construct clozes for the first `count` sentences
  const stopWords = new Set([
    'the','is','and','or','a','an','in','of','to','over','it','for','on','with','that','this','these','those',
    'said','says','told','asked','replied','went','came','know','think','thought','like','just','very',
    'much','many','some','any','every','each','other','another','same','such','only','also','then',
    'when','where','while','after','before','again','still','even','here','there','now','back',
  ]);
  function makeCloze(sentence, idxGlobal) {
    const words = sentence.split(/\s+/);
    // collect candidate word positions that are likely content words
    const candidates = [];
    for (let i = 0; i < words.length; i++) {
      const token = words[i];
      const core = token.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
      if (!core) continue;
      const isWord = /[a-zA-Z]/.test(core);
      if (!isWord) continue;
      if (core.length < 2 || core.length > 14) continue;
      if (stopWords.has(core.toLowerCase())) continue;
      candidates.push(i);
    }
    // fallback if no content word found
    if (candidates.length === 0) {
      for (let i = 0; i < words.length; i++) {
        const core = words[i].replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
        if (core && /[a-zA-Z]/.test(core)) { candidates.push(i); break; }
      }
    }
    if (candidates.length === 0) {
      return {
        sentence: sentence,
        id: idxGlobal,
        kind: 'cloze',
        answer: '',
        accepted: [],
        candidates: []
      };
    }
    const pick = candidates[Math.floor(rng() * candidates.length)];
    const token = words[pick];
    const core = token.replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
    const answer = core.toLowerCase();
    // replace the core inside the token with a blank
    const replacedToken = token.replace(core, '____');
    const newSentence = words.slice(0).map((w, i) => (i === pick ? replacedToken : w)).join(' ');

    // distractors: other content words from the sentence (never the answer itself)
    const distractSet = new Set();
    for (let i = 0; i < words.length; i++) {
      if (i === pick) continue;
      const wcore = words[i].replace(/^[^a-zA-Z']+|[^a-zA-Z']+$/g, '');
      if (!wcore) continue;
      if (!/[a-zA-Z]/.test(wcore)) continue;
      const lower = wcore.toLowerCase();
      if (stopWords.has(lower) || lower === answer) continue;
      distractSet.add(lower);
    }
    const distractors = Array.from(distractSet).slice(0, 4);

    return {
      sentence: newSentence,
      id: idxGlobal,
      kind: 'cloze',
      answer: answer,
      accepted: [answer],
      candidates: distractors
    };
  }

  const results = [];
  for (let k = 0; k < count; k++) {
    const idx = indices[k];
    const sent = filtered[idx];
    const cloze = makeCloze(sent, k);
    results.push(cloze);
  }
  return results;
}

export function scoreQuiz(questions, answers) {
  const perQuestion = [];
  let correct = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const ans = answers && answers[i] != null ? normalizeAnswer(answers[i]) : '';
    const expected = [q.answer, ...(q.accepted || [])].map(normalizeAnswer).filter((s) => s.length > 0);
    const ok = ans.length > 0 && expected.includes(ans);
    perQuestion.push(ok);
    if (ok) correct += 1;
  }
  const total = questions.length;
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return { correct, total, pct, perQuestion };
}


