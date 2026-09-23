// Composition root: owns store + player instances, routes the four views, wires all flows.
// Contract: plan.md §1a UI contracts + decisions.md §4 data model. ESM, no fetch, no timers.

import { openStore } from './lib/store.js';
import { ingest, normalizeTxt, chapterize } from './lib/pipeline.js';
import { extractArticle } from './lib/article.js';
import { tokenize, chunk } from './lib/text.js';
import { createPlayer, nextDelay } from './lib/player.js';
import { generateQuiz, scoreQuiz } from './lib/quiz.js';
import { suggestNextWpm, activeMs, sessionTicks } from './lib/metrics.js';
import { createLibraryView } from './ui/library.js';
import { createPlayerView } from './ui/player-view.js';
import { createQuizView } from './ui/quiz-view.js';
import { createDashboard } from './ui/dashboard.js';
import { focusMain } from './ui/a11y.js';

const DEFAULT_SETTINGS = {
  id: 'settings',
  wpm: 300,
  chunkSize: 2,
  orpEnabled: true,
  reducedMotion: 'auto',
  drill: false,
  previewWords: 2,
  fontScale: 1,
  textAlign: 'center',
  adaptiveSuggestions: true,
};

const sections = {
  library: document.querySelector('#view-library'),
  player: document.querySelector('#view-player'),
  quiz: document.querySelector('#view-quiz'),
  dashboard: document.querySelector('#view-dashboard'),
};

function show(name) {
  for (const [key, section] of Object.entries(sections)) {
    if (section) section.hidden = key !== name;
  }
  document.querySelectorAll('header nav button').forEach((button) => {
    const target = button.textContent.trim().toLowerCase();
    button.setAttribute('aria-current', target === name ? 'true' : 'false');
  });
  focusMain();
}

async function boot() {
  const store = await openStore();

  let settings = (await store.get('settings', 'settings')) ?? { ...DEFAULT_SETTINGS };
  settings = { ...DEFAULT_SETTINGS, ...settings, id: 'settings' };
  await store.put('settings', settings);

  let currentText = null;
  let currentChapter = null;
  let currentChapterIndex = 0;
  let currentPlayer = null;
  let currentChunks = [];
  let currentSession = null;
  let currentChunkSize = 2;
  let sessionOpen = false;
  let quizActive = false;
  let startedAt = 0;
  // Collect per-chunk emission events to compute active time via metrics.activeMs
  let readEvents = [];

  async function persistSettings() {
    await store.put('settings', settings);
    playerView.renderSettings(settings);
  }

  async function loadSessions() {
    const sessions = await store.getAll('sessions');
    return sessions.sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  }

  async function renderDashboard(suggestion = null) {
    const sessions = await loadSessions();
    dashboardView.render({ sessions, suggestion });
  }

  async function allTexts() {
    const texts = await store.getAll('texts');
    return texts.sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0));
  }

  async function openText(id, chapterIndex = null) {
    const texts = await store.getAll('texts');
    const text = texts.find((t) => t.id === id);
    if (!text || !text.chapters.length) {
      alert('That text is no longer in the library.');
      show('library');
      return;
    }
    currentText = text;
    // Explicit chapter choice wins; otherwise skip near-empty leading sections
    // (e.g. EPUB cover pages) when a substantial chapter exists.
    const requested = Number.isInteger(chapterIndex) && text.chapters[chapterIndex] ? text.chapters[chapterIndex] : null;
    currentChapter = requested ?? text.chapters.find((c) => (c.wordCount ?? 0) >= 50) ?? text.chapters[0];
    currentChapterIndex = text.chapters.indexOf(currentChapter);
    sessionOpen = true;
    currentChunkSize = settings.chunkSize;
    currentChunks = chunk(tokenize(currentChapter.text), { size: settings.chunkSize });
    currentPlayer = createPlayer({ chunks: currentChunks, wpm: settings.wpm });
    startedAt = Date.now();
    readEvents = [];
    currentPlayer.on('chunk', ({ chunk: shown }) => {
      const at = performance.now();
      const expected = nextDelay(shown, settings.wpm);
      readEvents.push({ at, expectedMs: expected });
    });
    playerView.start({
      player: currentPlayer,
      text: { title: `${text.title} — ${currentChapter.title}`, text: currentChapter.text },
    });
    playerView.renderRail(sessionTicks(await store.getAll('sessions')));
    show('player');
  }

  async function recordSession({ endedAt, drill, recognition } = {}) {
    // Idempotent: end may fire once per player run; guard duplicate records.
    if (!currentPlayer || !currentText || !sessionOpen) return;
    sessionOpen = false;
    const state = currentPlayer.getState();
    const shown = Math.min(state.index, currentChunks.length);
    const wordCount = currentChunks.slice(0, shown).reduce((sum, c) => sum + c.words.length, 0);
    // Prefer pause-excluded active time; fall back to wall clock if no chunks were emitted.
    const wallMs = endedAt - startedAt;
    const active = activeMs(readEvents);
    const elapsedMs = Math.max(1, active > 0 ? Math.round(active) : wallMs);
    const wpm = Math.round(wordCount / (elapsedMs / 60000));
    const priorSessions = await store.getAll('sessions');
    const kind = priorSessions.some((s) => s.textId === currentText.id) ? 'read' : 'baseline';
    currentSession = {
      id: crypto.randomUUID(),
      kind,
      textId: currentText.id,
      chapterIndex: currentChapterIndex,
      chapterTitle: currentChapter.title,
      chunkSize: currentChunkSize,
      targetWpm: settings.wpm,
      startedAt,
      endedAt,
      wordCount,
      elapsedMs,
      wpm,
      quizId: null,
      correct: recognition ? recognition.correct : null,
      total: recognition ? recognition.total : null,
      comprehensionPct: null,
      drill: drill ?? undefined,
    };
    await store.put('sessions', currentSession);
    playerView.renderRail(sessionTicks(await store.getAll('sessions')));
    quizActive = true;
    const seed = Date.now() % 100000;
    const questions = generateQuiz(currentChapter.text, { n: 5, seed });
    quizView.start({
      id: crypto.randomUUID(),
      textId: currentText.id,
      chapterIndex: currentChapterIndex,
      createdAt: Date.now(),
      seed,
      questions,
    });
    show('quiz');
  }

  const libraryView = createLibraryView(sections.library, {
    onImportFile: async (file) => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const book = await ingest({ name: file.name, arrayBuffer });
        const record = {
          id: crypto.randomUUID(),
          title: book.title,
          source: book.source,
          importedAt: Date.now(),
          chapters: book.chapters,
          totalWords: book.chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0),
        };
        await store.put('texts', record);
        libraryView.render(await allTexts());
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      }
    },
    onImportUrl: async (url) => {
      let parsed;
      try {
        parsed = new URL(url);
      } catch {
        show('library');
        libraryView.showPaste('That URL is not valid. Paste the article text below instead.');
        return;
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        show('library');
        libraryView.showPaste('Only http(s) URLs can be fetched. Paste the article text below instead.');
        return;
      }
      const failToPaste = (reason) => {
        show('library');
        libraryView.showPaste(`${reason} Paste the article text below instead.`);
      };
      let response;
      try {
        response = await fetch(url);
      } catch {
        failToPaste('Could not fetch that URL (network or CORS blocked it).');
        return;
      }
      if (!response.ok) {
        failToPaste(`Fetch failed with status ${response.status}.`);
        return;
      }
      try {
        const contentType = response.headers.get('content-type') ?? '';
        const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() ?? 'article';
        if (/text\/html|application\/xhtml/.test(contentType) || !/\.[a-z0-9]{2,5}([?#]|$)/i.test(parsed.pathname)) {
          const article = extractArticle(await response.text());
          const words = article.text.split(/\s+/).filter(Boolean);
          if (words.length < 30) throw new Error('no readable article text found');
          const chapters = chapterize(normalizeTxt(article.text));
          await store.put('texts', {
            id: crypto.randomUUID(),
            title: article.title || parsed.hostname,
            source: 'url',
            url,
            importedAt: Date.now(),
            chapters,
            totalWords: chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0),
          });
        } else {
          const buffer = await response.arrayBuffer();
          const ext = /\.([a-z0-9]{2,5})([?#]|$)/i.exec(parsed.pathname)?.[1]?.toLowerCase();
          const name = ext ? lastSegment : `${lastSegment}.txt`;
          const book = await ingest({ name, arrayBuffer: buffer });
          await store.put('texts', {
            id: crypto.randomUUID(),
            title: book.title,
            source: book.source,
            url,
            importedAt: Date.now(),
            chapters: book.chapters,
            totalWords: book.chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0),
          });
        }
        libraryView.render(await allTexts());
        show('library');
      } catch (error) {
        failToPaste(`Could not use that URL (${error.message}).`);
      }
    },
    onOpenText: openText,
    onDeleteText: async (id) => {
      await store.del('texts', id);
      libraryView.render(await allTexts());
    },
    onExport: exportData,
    onImportJson: importData,
  });

  const playerView = createPlayerView(sections.player, {
    onSessionEnd: (payload) => {
      recordSession(payload).catch((error) => {
        console.error(error);
        alert(`Could not save your session: ${error.message}`);
      });
    },
    onExit: () => {
      currentPlayer?.pause();
      show('library');
    },
    onSettingsChange: async (partial) => {
      const previousWpm = settings.wpm;
      settings = { ...settings, ...partial, id: 'settings' };
      await persistSettings();
      if (typeof settings.wpm === 'number' && settings.wpm !== previousWpm) {
        currentPlayer?.setWpm(settings.wpm);
      }
    },
  });

  const quizView = createQuizView(sections.quiz, {
    onSave: async (editedQuiz) => {
      const answers = editedQuiz.questions.map((q) => q.userAnswer ?? '');
      const result = scoreQuiz(editedQuiz.questions, answers);
      await store.put('quizzes', {
        id: editedQuiz.id,
        textId: editedQuiz.textId,
        chapterIndex: editedQuiz.chapterIndex ?? null,
        createdAt: editedQuiz.createdAt,
        seed: editedQuiz.seed,
        questions: editedQuiz.questions,
        edited: editedQuiz.edited === true,
        score: { correct: result.correct, total: result.total, pct: result.pct },
      });
      if (currentSession) {
        // Drill sessions keep their recognition counts in correct/total; their
        // quiz score lives on the quiz record's `score` field instead.
        const isDrill = currentSession.drill === 'span';
        currentSession = {
          ...currentSession,
          quizId: editedQuiz.id,
          ...(isDrill ? {} : {
            correct: result.correct,
            total: result.total,
            comprehensionPct: result.pct,
          }),
        };
        await store.put('sessions', currentSession);
      }
      const suggestion = settings.adaptiveSuggestions && currentSession
        ? suggestNextWpm(currentSession.wpm, currentSession.comprehensionPct)
        : null;
      quizActive = false;
      await renderDashboard(suggestion);
      show('dashboard');
    },
    onCancel: async () => {
      quizActive = false;
      await renderDashboard(null);
      show('dashboard');
    },
  });

  const dashboardView = createDashboard(sections.dashboard, {
    onStartSession: (textId) => {
      if (textId) openText(textId);
      else show('library');
    },
    onExport: exportData,
    onImportJson: importData,
    onAcceptWpm: async (nextWpm) => {
      settings = { ...settings, wpm: nextWpm, id: 'settings' };
      await persistSettings();
      await renderDashboard(null);
    },
  });

  async function exportData() {
    const data = await store.exportAll();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = 'speedread-export.json';
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  async function importData(json) {
    if (!window.confirm('Replace all local data with the imported file?')) return;
    const result = await store.importAll(json);
    if (!result.ok) {
      alert(`Import failed: ${result.error}`);
      return;
    }
    location.reload();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) currentPlayer?.pause();
  });

  // Shell header buttons were static placeholders; wire them to view routing.
  document.querySelectorAll('header nav button').forEach((button) => {
    button.addEventListener('click', async () => {
      const target = button.textContent.trim().toLowerCase();
      if (target === 'player' && currentText) {
        show('player');
        return;
      }
      if (target === 'quiz' && quizActive) {
        show('quiz');
        return;
      }
      if (target === 'dashboard') {
        await renderDashboard(null);
        show('dashboard');
        return;
      }
      show('library');
    });
  });

  playerView.renderSettings(settings);
  libraryView.render(await allTexts());
  await renderDashboard(null);
  show('library');
}

boot().catch((error) => {
  console.error('SpeedReading failed to start', error);
});
