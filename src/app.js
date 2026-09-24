// Composition root: owns store + player instances, routes the four views, wires all flows.
// Contract: plan.md §1a UI contracts + decisions.md §4 data model. ESM, no fetch, no timers.

import { openStore } from './lib/store.js';
import { createProfileRepository } from './lib/profile.js';
import { ingest, normalizeTxt, chapterize, MAX_IMPORT_BYTES } from './lib/pipeline.js';
import { extractArticle } from './lib/article.js';
import { tokenize, chunk } from './lib/text.js';
import { createPlayer, nextDelay } from './lib/player.js';
import { generateQuiz, scoreQuiz } from './lib/quiz.js';
import { suggestNextWpm, activeMs, sessionTicks } from './lib/metrics.js';
import { sessionMoments, rewardMoments } from './lib/events.js';
import { sessionXp, totalXp, levelFor } from './lib/xp.js';
import { dayMap as buildDayMap, streakStats, dayKey } from './lib/streak.js';
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
  goals: {},
  readingMode: 'page',
  highlightWidth: 2,
  pageWidth: 'medium',
};

const sections = {
  library: document.querySelector('#view-library'),
  player: document.querySelector('#view-player'),
  quiz: document.querySelector('#view-quiz'),
  dashboard: document.querySelector('#view-dashboard'),
};
// boot() installs the real implementation once state exists.
let refreshNav = () => {};

function show(name) {
  // Persist the current view on the body for styling/consumption by CSS/JS
  document.body.dataset.view = name;
  for (const [key, section] of Object.entries(sections)) {
    if (section) section.hidden = key !== name;
  }
  document.querySelectorAll('header nav button').forEach((button) => {
    const target = button.textContent.trim().toLowerCase();
    button.setAttribute('aria-current', target === name ? 'true' : 'false');
  });
  // Player/Quiz need open content (ADR-21 fallbacks); a silent no-op reads as a
  // broken button, so their availability is mirrored on the nav itself.
  refreshNav();
  // Focus mode: when entering the player view, hide chrome; restore on exit
  if (name === 'player') {
    document.body.setAttribute('data-focus-mode', 'true');
  } else {
    document.body.removeAttribute('data-focus-mode');
  }
  focusMain();
}

async function boot() {
  // Boot without simulate-corrupt hook. The previous hidden URL parameter was a
  // test hook and is no longer supported.
  const store = await openStore();
  // Migrate: ensure settings exist
  let settings = (await store.getAll('settings')).find((s) => s?.id === 'settings') ?? { ...DEFAULT_SETTINGS };
  settings = { ...DEFAULT_SETTINGS, ...settings, id: 'settings' };
  await store.put('settings', settings);

  // Profile repository: load or create profile; keep the resume candidate in closure.
  const profileRepo = createProfileRepository(store, { profileId: 'local' });
  const profile = await profileRepo.load?.() ?? null;
  const resumeCandidate = profile?.activeSession ?? null;

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
  let currentSessionId = null;
  // Collect per-chunk emission events to compute active time via metrics.activeMs
  let readEvents = [];
  // Elapsed ms restored from an interrupted-session snapshot (M-P05B): added to
  // this run's active time at record so pause-excluded totals stay exact.
  let restoredElapsedMs = 0;

  // Nav availability mirror (ADR-21 fallbacks, HC-C feedback): Player needs an
  // open text, Quiz needs a completed session.
  refreshNav = () => {
    for (const button of document.querySelectorAll('header nav button')) {
      const target = button.textContent.trim().toLowerCase();
      if (target === 'player') {
        button.disabled = !currentText;
        button.title = currentText ? '' : 'Open a text first';
      } else if (target === 'quiz') {
        button.disabled = !quizActive;
        button.title = quizActive ? '' : 'Finish a session first';
      }
    }
  };

  async function persistSettings() {
    await store.put('settings', settings);
    playerView.renderSettings(settings);
  }

  // Persist the resume snapshot (ADR-23 ActiveSession shape) on pause/hide/exit.
  const takeSnapshot = async () => {
    if (!currentText || !currentPlayer || !sessionOpen) return;
    try {
      const state = currentPlayer.getState?.() ?? {};
      const active = activeMs(readEvents);
      await profileRepo.setActiveSession({
        sessionId: currentSessionId,
        textId: currentText.id,
        chapterIndex: currentChapterIndex,
        chunkIndex: state.index ?? 0,
        wpm: settings.wpm,
        chunkSize: currentChunkSize,
        elapsedMs: active > 0 ? Math.round(active) : Math.max(0, Date.now() - startedAt),
        startedAt,
        savedAt: Date.now(),
      });
    } catch {
      // best-effort only
    }
  };
  const clearSnapshot = async () => {
    try { await profileRepo.setActiveSession(null); } catch { /* best-effort */ }
  };

  async function loadSessions() {
    const sessions = await store.getAll('sessions');
    return sessions.sort((a, b) => (a.startedAt ?? 0) - (b.startedAt ?? 0));
  }

  async function renderDashboard(suggestion = null, summary = null) {
    const sessions = await loadSessions();
    const quizzes = await store.getAll('quizzes');
    dashboardView.render({ sessions, quizzes, suggestion, summary });
    await renderHud(sessions);
  }

  // Header HUD (M-G06): XP total + level + streak. The header (and HUD) hides
  // in player focus mode via the existing body[data-focus-mode] rule.
  async function renderHud(sessions = null) {
    try {
      const list = sessions ?? await loadSessions();
      const dm = buildDayMap(list);
      const total = totalXp(list, { dayMap: dm, challengeCompletions: [], recordImprovements: [], achievementUnlocks: [] });
      const level = levelFor(total);
      const streak = streakStats(dm, dayKey(Date.now()));
      const hud = document.getElementById('hud');
      if (hud) {
        hud.textContent = `${total} XP · Level ${level.name} · ` +
          (streak.current >= 2 ? `${streak.current}-day streak` : 'no streak yet');
      }
    } catch {
      // best-effort only; never break boot
    }
  }

  // Session summary payload (ADR-25 §19): computed once at quiz Done.
  async function buildSummary() {
    if (!currentSession) return null;
    const sessions = await loadSessions();
    const quizzes = await store.getAll('quizzes');
    const prior = sessions.filter((s) => s.id !== currentSession.id);
    const baseline = prior.length === 0 ? null : {
      avgWpm: prior.reduce((a, s) => a + (s.wpm ?? 0), 0) / prior.length,
      bestWpm: Math.max(...prior.map((s) => s.wpm ?? 0)),
    };
    const moments = sessionMoments({ sessions, quizzes, today: Date.now(), sessionId: currentSession.id });
    // Reward-once (M-G06): first display wins; seen ids never celebrated again.
    // Freshness is global (all moments ever), so catch-up unlocks celebrate once
    // at the next summary and never repeat on later visits or sessions.
    const seen = new Set((await profileRepo.load?.())?.seenAchievements ?? []);
    const freshUnlocks = rewardMoments({ sessions, quizzes, today: Date.now() })
      .filter((m) => m.type === 'achievement' && !seen.has(m.payload?.achievementId));
    if (freshUnlocks.length > 0) {
      await profileRepo.markSeen(freshUnlocks.map((m) => m.payload.achievementId));
    }
    const repeatIndex = prior.filter((s) => s.textId === currentSession.textId).length;
    const xpEarned = sessionXp(currentSession, { repeatIndex });
    const dm = buildDayMap(sessions);
    const level = levelFor(totalXp(sessions, { dayMap: dm, challengeCompletions: [], recordImprovements: [], achievementUnlocks: [] }));
    const streak = streakStats(dm, dayKey(Date.now()));
    const suggestion = settings.adaptiveSuggestions
      ? suggestNextWpm(currentSession.wpm, currentSession.comprehensionPct)
      : null;
    return {
      session: currentSession,
      textTitle: currentText?.title ?? 'Reading',
      chapterTitle: currentChapter?.title ?? '',
      baseline, moments, xpEarned, level,
      heroUnlock: freshUnlocks.length > 0 ? freshUnlocks[0].payload.achievementId : null,
      streak: { current: streak.current ?? 0, longest: streak.longest ?? 0 },
      suggestion,
    };
  }

  async function allTexts() {
    const texts = await store.getAll('texts');
    return texts.sort((a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0));
  }

  // Per-item shelf metadata (M-P06B): progress = chapters with sessions,
  // lastLabel from the latest session, completed = latest session quizzed.
  function libraryMeta(texts, sessions) {
    const byText = new Map();
    for (const s of sessions) {
      if (!s || !s.textId) continue;
      if (!byText.has(s.textId)) byText.set(s.textId, []);
      byText.get(s.textId).push(s);
    }
    const out = {};
    for (const t of texts) {
      const list = (byText.get(t.id) ?? []).sort((a, b) => (b.endedAt ?? b.startedAt ?? 0) - (a.endedAt ?? a.startedAt ?? 0));
      const total = Array.isArray(t.chapters) && t.chapters.length > 0 ? t.chapters.length : 1;
      const done = new Set(list.map((s) => s.chapterIndex ?? 0)).size;
      const last = list[0] ?? null;
      const scored = list.filter((s) => s.drill !== 'span' && typeof s.wpm === 'number' && typeof s.comprehensionPct === 'number');
      const best = scored.slice().sort((a, b) => b.wpm - a.wpm)[0] ?? null;
      out[t.id] = {
        progress: list.length === 0 ? null : Math.min(1, done / total),
        lastLabel: last ? `last lap ${Math.round(last.wpm ?? 0)} wpm` : '',
        completed: last ? last.comprehensionPct !== null && last.comprehensionPct !== undefined : false,
        laps: list.length,
        mastery: best ? { wpm: best.wpm, comprehensionPct: best.comprehensionPct } : null,
      };
    }
    return out;
  }

  async function renderLibrary() {
    const texts = await allTexts();
    const sessions = await store.getAll('sessions');
    libraryView.render(texts, libraryMeta(texts, sessions), { sessions: sessions.length });
  }

  async function openText(id, chapterIndex = null, resume = null) {
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
    currentSessionId = crypto.randomUUID();
    currentPlayer = createPlayer({ chunks: currentChunks, wpm: settings.wpm });
    startedAt = Date.now();
    readEvents = [];
    restoredElapsedMs = 0;
    currentPlayer.on('chunk', ({ chunk: shown }) => {
      const at = performance.now();
      const expected = nextDelay(shown, settings.wpm);
      readEvents.push({ at, expectedMs: expected });
    });
    // Interrupted-session restore: paused at the saved chunk, elapsed seeded.
    if (resume && resume.textId === text.id && Number.isInteger(resume.chunkIndex)) {
      currentPlayer.seek(Math.min(resume.chunkIndex, Math.max(0, currentChunks.length - 1)));
      restoredElapsedMs = Math.max(0, Math.round(resume.elapsedMs ?? 0));
    }
    playerView.start({
      player: currentPlayer,
      text: { title: `${text.title} — ${currentChapter.title}`, text: currentChapter.text },
      goal: settings.goals?.[text.id] ?? null,
      chunks: currentChunks,
    });
    if (resume) currentPlayer.pause(); // restored sessions land paused at the saved chunk
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
    // Restored snapshots contribute their saved active total once (never double-counted:
    // readEvents only holds this run's emissions, and snapshots clear on record).
    const wallMs = endedAt - startedAt;
    const active = activeMs(readEvents);
    const elapsedMs = Math.max(1, Math.round(restoredElapsedMs + (active > 0 ? active : wallMs)));
    restoredElapsedMs = 0;
    const wpm = Math.round(wordCount / (elapsedMs / 60000));
    const priorSessions = await store.getAll('sessions');
    const kind = priorSessions.some((s) => s.textId === currentText.id) ? 'read' : 'baseline';
    currentSession = {
      id: currentSessionId ?? crypto.randomUUID(),
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
    await clearSnapshot();
    playerView.renderRail(sessionTicks(await store.getAll('sessions')));
    await renderHud();
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
        const totalWords = book.chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0);
        const dupe = (await allTexts()).find((t) => t.title === book.title && (t.totalWords ?? t.wordCount ?? 0) === totalWords);
        if (dupe) {
          libraryView.showNotice({
            text: `“${book.title}” is already in the library.`,
            action: { label: 'Open', onClick: () => openText(dupe.id) },
          });
          show('library');
          return;
        }
        const record = {
          id: crypto.randomUUID(),
          title: book.title,
          source: book.source,
          importedAt: Date.now(),
          chapters: book.chapters,
          totalWords,
        };
        await store.put('texts', record);
        await renderLibrary();
        libraryView.showNotice({ text: `Imported “${book.title}”.` });
      } catch (error) {
        libraryView.showNotice({ text: `Import failed: ${error.message}` });
      }
      show('library');
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
        const contentLength = Number(response.headers.get('content-length') ?? 0);
        if (contentLength > MAX_IMPORT_BYTES) {
          failToPaste('That article is over the 10 MB import limit.');
          return;
        }
        const contentType = response.headers.get('content-type') ?? '';
        const lastSegment = parsed.pathname.split('/').filter(Boolean).pop() ?? 'article';
        if (/text\/html|application\/xhtml/.test(contentType) || !/\.[a-z0-9]{2,5}([?#]|$)/i.test(parsed.pathname)) {
          const article = extractArticle(await response.text());
          if (article.text.length > MAX_IMPORT_BYTES) {
            failToPaste('That article is over the 10 MB import limit.');
            return;
          }
          const words = article.text.split(/\s+/).filter(Boolean);
          if (words.length < 30) throw new Error('no readable article text found');
          const chapters = chapterize(normalizeTxt(article.text));
          const totalWords = chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0);
          const title = article.title || parsed.hostname;
          const dupe = (await allTexts()).find((t) => t.title === title && (t.totalWords ?? t.wordCount ?? 0) === totalWords);
          if (dupe) {
            libraryView.showNotice({
              text: `“${title}” is already in the library.`,
              action: { label: 'Open', onClick: () => openText(dupe.id) },
            });
            show('library');
            return;
          }
          await store.put('texts', {
            id: crypto.randomUUID(),
            title,
            source: 'url',
            url,
            importedAt: Date.now(),
            chapters,
            totalWords,
          });
        } else {
          const buffer = await response.arrayBuffer();
          const ext = /\.([a-z0-9]{2,5})([?#]|$)/i.exec(parsed.pathname)?.[1]?.toLowerCase();
          const name = ext ? lastSegment : `${lastSegment}.txt`;
          const book = await ingest({ name, arrayBuffer: buffer });
          const fileTotalWords = book.chapters.reduce((sum, c) => sum + (c.wordCount ?? 0), 0);
          const fileDupe = (await allTexts()).find((t) => t.title === book.title && (t.totalWords ?? t.wordCount ?? 0) === fileTotalWords);
          if (fileDupe) {
            libraryView.showNotice({
              text: `“${book.title}” is already in the library.`,
              action: { label: 'Open', onClick: () => openText(fileDupe.id) },
            });
            show('library');
            return;
          }
          await store.put('texts', {
            id: crypto.randomUUID(),
            title: book.title,
            source: book.source,
            url,
            importedAt: Date.now(),
            chapters: book.chapters,
            totalWords: fileTotalWords,
          });
        }
        await renderLibrary();
        show('library');
      } catch (error) {
        failToPaste(`Could not use that URL (${error.message}).`);
      }
    },
    onOpenText: openText,
    onDeleteText: async (id) => {
      await store.del('texts', id);
      await renderLibrary();
      const firstOpen = sections.library.querySelector('button[data-action="open"]');
      if (firstOpen) firstOpen.focus();
    },
    onFavorite: async (id, favorite) => {
      const texts = await store.getAll('texts');
      const text = texts.find((t) => t.id === id);
      if (!text) return;
      await store.put('texts', { ...text, favorite });
      await renderLibrary();
    },
    onPrefsChange: async (prefs) => {
      await profileRepo.setUiPrefs({ library: prefs });
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
      takeSnapshot().catch(() => {});
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
    onGoalChange: async (goal) => {
      if (!currentText) return;
      const goals = { ...(settings.goals ?? {}) };
      if (goal) goals[currentText.id] = goal;
      else delete goals[currentText.id];
      settings = { ...settings, goals, id: 'settings' };
      await persistSettings();
    },
    onFocusToggle: () => {
      // F key: app owns the chrome-hiding attribute; the view only requests it.
      if (document.body.getAttribute('data-focus-mode') === 'true') {
        document.body.removeAttribute('data-focus-mode');
      } else {
        document.body.setAttribute('data-focus-mode', 'true');
      }
    },
  });

  const quizView = createQuizView(sections.quiz, {
    onSave: async (editedQuiz) => {
      const answers = editedQuiz.questions.map((q) => q.userAnswer ?? '');
      const result = scoreQuiz(editedQuiz.questions, answers);
      if (editedQuiz.edited === true) {
        // Authoring: quiz record only — NEVER the completed session (ADR-12, I3).
        await store.put('quizzes', {
          id: editedQuiz.id,
          textId: editedQuiz.textId,
          chapterIndex: editedQuiz.chapterIndex ?? null,
          createdAt: editedQuiz.createdAt,
          seed: editedQuiz.seed,
          questions: editedQuiz.questions,
          edited: true,
          score: { correct: result.correct, total: result.total, pct: result.pct },
        });
        quizView.startReview(editedQuiz, result, { edited: true });
        show('quiz');
        return;
      }
      if (currentSession && currentSession.quizId && editedQuiz.edited !== true) {
        // I3 single-amend: this session already has answers — re-render review
        // without touching the session record or writing a second quiz.
        quizView.startReview({ ...editedQuiz, questions: editedQuiz.questions }, result);
        show('quiz');
        return;
      }
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
      await renderHud();
      // Answering save amends the session at most once (I3); review renders next.
      quizView.startReview({ ...editedQuiz, questions: editedQuiz.questions }, result);
      show('quiz');
    },
    onDone: async () => {
      quizActive = false;
      await renderDashboard(null, await buildSummary());
      show('dashboard');
      dashboardView.focusSummary();
    },
    onCancel: async () => {
      quizActive = false;
      await clearSnapshot();
      await renderDashboard(null);
      show('dashboard');
    },
  });

  const dashboardView = createDashboard(sections.dashboard, {
    onStartSession: (textId) => {
      if (textId) openText(textId);
      else show('library');
    },
    onShowLog: async () => {
      await renderDashboard(null);
      show('dashboard');
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
    if (document.hidden) {
      currentPlayer?.pause();
      takeSnapshot().catch(() => {});
    }
  });
  // Page close / navigation away: write resume snapshot
  window.addEventListener('pagehide', () => {
    takeSnapshot().catch(() => {});
  });
  window.addEventListener('beforeunload', () => {
    takeSnapshot().catch(() => {});
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
  libraryView.setPrefs(profile?.uiPrefs?.library ?? null);
  const bootTexts = await allTexts();
  const bootSessions = await store.getAll('sessions');
  libraryView.render(bootTexts, libraryMeta(bootTexts, bootSessions), { sessions: bootSessions.length });
  // Interrupted-session resume (M-P05B): snapshot with a missing textId is
  // discarded silently; otherwise offer Resume paused at the saved chunk.
  if (resumeCandidate && resumeCandidate.textId) {
    const found = bootTexts.find((t) => t.id === resumeCandidate.textId);
    if (!found) {
      await clearSnapshot();
    } else {
      const chapter = found.chapters[resumeCandidate.chapterIndex] ?? found.chapters[0];
      libraryView.showResume({
        title: found.title,
        detail: `${chapter?.title ?? ''} at chunk ${(resumeCandidate.chunkIndex ?? 0) + 1}`.trim(),
        onResume: async () => {
          libraryView.clearResume();
          await openText(found.id, resumeCandidate.chapterIndex ?? null, resumeCandidate);
        },
        onDismiss: async () => {
          await clearSnapshot();
        },
      });
    }
  }
  await renderDashboard(null);
  show('library');
}

boot().catch((error) => {
  console.error('SpeedReading failed to start', error);
  // Corrupted-data banner path: show a user-visible retry option if boot failed
  try {
    const banner = document.getElementById('corrupted-banner');
    if (banner) {
      banner.style.display = 'block';
      const msg = banner.querySelector('.corrupted-message');
      if (msg) msg.textContent = error?.message ?? 'Storage failed to open';
      const retry = document.getElementById('corrupted-retry');
      retry?.addEventListener('click', () => location.reload());
    }
  } catch {
    // ignore banner rendering failures
  }
});