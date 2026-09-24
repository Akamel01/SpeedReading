// RSVP player view: ORP-anchored renderer, keyboard map, SR/reduced-motion mode, settings controls.
// Consumes an INJECTED player (src/lib/player.js); never creates timers or players.
// Contract: createPlayerView(root, {onSessionEnd, onExit, onSettingsChange, onGoalChange, onFocusToggle})
//   -> {start({player, text, goal}), showSrText(text), hide(), renderSettings(settings), renderRail(ticks), setGoal(goal), clearGoal()}

import { announce, prefersReducedMotion } from './a11y.js';
import { splitSentences as splitSentencesLib } from '../lib/text.js';

const SENTENCE_END = /[.!?]["')\]]*\s*$/;


export function createPlayerView(root, { onSessionEnd, onExit, onSettingsChange, onGoalChange, onFocusToggle } = {}) {
  let player = null;
  let chunkCount = 0;
  let currentWpm = 300;
  let settings = { fontScale: 1, textAlign: 'center', orpEnabled: true, chunkSize: 2, reducedMotion: 'auto', drill: false, previewWords: 2 };
  let recognitionCorrect = 0;
  let recognitionTotal = 0;
  let srMode = false;
  let sentences = [];
  let sentenceIndex = 0;

  // ---- DOM (classes only; root is #view-player) ----
  const header = document.createElement('h2');
  header.className = 'player-title';

  // Goal chip (M-P05B): hidden unless a well-formed goal is set via setGoal().
  const goalChip = document.createElement('span');
  goalChip.className = 'player-goal chip goal';
  goalChip.hidden = true;

  const stage = document.createElement('div');
  stage.className = 'rsvp-stage';
  stage.setAttribute('aria-hidden', 'true');
  const left = document.createElement('span');
  left.className = 'rsvp-left';
  const orp = document.createElement('span');
  orp.className = 'rsvp-orp';
  const right = document.createElement('span');
  right.className = 'rsvp-right';
  // Prototype: ruled stage with meta rows above/below the anchored word.
  const stageTop = document.createElement('div');
  stageTop.className = 'stage-meta top';
  const stageBottom = document.createElement('div');
  stageBottom.className = 'stage-meta bottom';
  const stageCounts = document.createElement('span');
  stageCounts.className = 'muted data player-counts';
  const stageClock = document.createElement('span');
  stageClock.className = 'muted data player-elapsed';
  stageBottom.append(stageCounts, stageClock);
  stageTop.append(goalChip);
  stage.append(stageTop, left, orp, right, stageBottom);

  const progress = document.createElement('p');
  progress.className = 'player-progress';
  const progressBar = document.createElement('div');
  progressBar.className = 'player-progress-bar';
  progressBar.setAttribute('role', 'progressbar');
  progressBar.setAttribute('aria-valuemin', '0');
  progressBar.setAttribute('aria-valuemax', '100');
  progressBar.setAttribute('aria-valuenow', '0');
  progressBar.setAttribute('aria-label', 'Chapter progress');
  const progressFill = document.createElement('span');
  progressBar.appendChild(progressFill);

  const controls = document.createElement('div');
  controls.className = 'player-controls';
  const makeButton = (label, name) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.className = `player-btn player-btn-${name}`;
    b.setAttribute('aria-label', label);
    controls.appendChild(b);
    return b;
  };
  const prevBtn = makeButton('Prev', 'prev');
  const playBtn = makeButton('Play', 'play');
  const nextBtn = makeButton('Next', 'next');
  const restartBtn = makeButton('Restart', 'restart');
  // Speed cluster (prototype): − value + in one control.
  const speedCluster = document.createElement('span');
  speedCluster.className = 'player-speed';
  const slowerBtn = document.createElement('button');
  slowerBtn.type = 'button';
  slowerBtn.className = 'player-btn player-btn-slower btn quiet';
  slowerBtn.textContent = '−';
  slowerBtn.setAttribute('aria-label', 'Slower');
  const speedValue = document.createElement('span');
  speedValue.className = 'player-speed-value data';
  const fasterBtn = document.createElement('button');
  fasterBtn.type = 'button';
  fasterBtn.className = 'player-btn player-btn-faster btn quiet';
  fasterBtn.textContent = '+';
  fasterBtn.setAttribute('aria-label', 'Faster');
  speedCluster.append(slowerBtn, speedValue, fasterBtn);
  const chunkChip = document.createElement('span');
  chunkChip.className = 'chip player-chunk-chip';
  const keysHint = document.createElement('span');
  keysHint.className = 'muted player-keys-hint';
  keysHint.textContent = 'Space pause · ←/→ skip · +/− speed · F focus · R restart';
  const exitBtn = makeButton('Exit', 'exit');
  controls.append(speedCluster, chunkChip, keysHint);

  const settingsRow = document.createElement('div');
  settingsRow.className = 'player-settings';
  const makeSelect = (labelText, name, options) => {
    const label = document.createElement('label');
    label.textContent = labelText;
    const select = document.createElement('select');
    select.className = `player-setting-${name}`;
    for (const [value, text] of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      select.appendChild(opt);
    }
    label.appendChild(select);
    settingsRow.appendChild(label);
    return select;
  };
  const fontSel = makeSelect('Text size', 'font-scale', [['1', '100%'], ['1.25', '125%'], ['1.5', '150%']]);
  const alignSel = makeSelect('Text align', 'text-align', [['center', 'Center'], ['left', 'Left']]);
  const orpLabel = document.createElement('label');
  orpLabel.textContent = 'ORP highlight';
  const orpToggle = document.createElement('input');
  orpToggle.type = 'checkbox';
  orpToggle.className = 'player-setting-orp';
  orpLabel.appendChild(orpToggle);
  settingsRow.appendChild(orpLabel);
  const chunkSel = makeSelect('Chunk size', 'chunk-size', [['1', '1'], ['2', '2'], ['3', '3 (experimental)']]);
  const motionSel = makeSelect('Calm mode', 'reduced-motion', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]);
  // Preview drill (ADR-18): practice reading ahead beside the fixed anchor; no speed promises.
  const drillSel = makeSelect('Preview drill', 'drill', [['off', 'Off'], ['on', 'On']]);
  const previewSel = makeSelect('Preview words', 'preview', [['0', '0'], ['1', '1'], ['2', '2']]);

  // Session goal controls live inside the Session disclosure; app.js persists via onGoalChange.
  const goalTypeSel = makeSelect('Goal', 'goal-type', [['none', 'No goal'], ['wpm', 'Reach WPM'], ['words', 'Read words'], ['time', 'Read time']]);
  const goalTargetInput = document.createElement('input');
  goalTargetInput.type = 'number';
  goalTargetInput.min = '1';
  goalTargetInput.className = 'player-setting-goal-target';
  goalTargetInput.setAttribute('aria-label', 'Goal target');
  goalTargetInput.placeholder = 'target';
  goalTypeSel.closest('label').appendChild(goalTargetInput);
  const goalApply = document.createElement('button');
  goalApply.type = 'button';
  goalApply.textContent = 'Set goal';
  goalApply.className = 'player-btn player-btn-goal';
  goalApply.setAttribute('aria-label', 'Set session goal');
  goalTypeSel.closest('label').appendChild(goalApply);

  // Progressive disclosure: Session panel collapsed by default (frozen spec).
  const sessionDetails = document.createElement('details');
  sessionDetails.className = 'player-session';
  const sessionSummary = document.createElement('summary');
  sessionSummary.textContent = 'Session';
  sessionDetails.append(sessionSummary, settingsRow);

  // Keyboard map (? key toggles).
  const helpDetails = document.createElement('details');
  helpDetails.className = 'player-help';
  const helpSummary = document.createElement('summary');
  helpSummary.textContent = '? Keys';
  const helpList = document.createElement('ul');
  for (const [key, action] of [['Space', 'pause / resume'], ['← →', 'step chunk'], ['↑ ↓ or + −', 'speed'], ['R', 'restart'], ['F', 'focus mode'], ['Esc', 'exit'], ['?', 'this list']]) {
    const li = document.createElement('li');
    li.textContent = `${key}: ${action}`;
    helpList.appendChild(li);
  }
  helpDetails.append(helpSummary, helpList);

  // Screen-reader / reduced-motion manual mode
  const srPanel = document.createElement('div');
  srPanel.className = 'player-sr';
  srPanel.hidden = true;
  const srSentence = document.createElement('p');
  srSentence.className = 'player-sr-sentence';
  srSentence.setAttribute('aria-live', 'polite');
  const srNav = document.createElement('div');
  srNav.className = 'player-sr-nav';
  const srPrev = document.createElement('button');
  srPrev.type = 'button';
  srPrev.textContent = 'Previous sentence';
  const srNext = document.createElement('button');
  srNext.type = 'button';
  srNext.textContent = 'Next sentence';
  srNav.append(srPrev, srNext);
  srPanel.append(srSentence, srNav);

  // Inline recognition check shown at sentence boundaries while the drill is on.
  const recognition = document.createElement('div');
  recognition.className = 'player-recognition';
  recognition.hidden = true;
  const recognitionPrompt = document.createElement('p');
  recognitionPrompt.className = 'player-recognition-prompt';
  const recognitionForm = document.createElement('form');
  const recognitionInput = document.createElement('input');
  recognitionInput.type = 'text';
  recognitionInput.className = 'player-recognition-input';
  recognitionInput.placeholder = 'Your answer';
  recognitionInput.setAttribute('aria-label', 'Recognition check answer');
  const recognitionSubmit = document.createElement('button');
  recognitionSubmit.type = 'submit';
  recognitionSubmit.textContent = 'Check';
  recognitionForm.append(recognitionInput, recognitionSubmit);
  const recognitionScore = document.createElement('p');
  recognitionScore.className = 'player-recognition-score';
  recognition.append(recognitionPrompt, recognitionForm, recognitionScore);

  // Marginalia rail (S3): one pencil tick per session, best in marker.
  const rail = document.createElement('aside');
  rail.className = 'player-rail';
  rail.setAttribute('aria-label', 'Session margin');
  const railTitle = document.createElement('h3');
  railTitle.className = 'player-rail-title';
  railTitle.textContent = 'Session margin';
  const railTicks = document.createElement('div');
  railTicks.className = 'player-rail-ticks';
  rail.append(railTitle, railTicks);

  const pageCol = document.createElement('div');
  pageCol.className = 'player-page';

  // Views own their subtree: replace any shell placeholder content.
  root.replaceChildren(rail, pageCol, srPanel, recognition);
  pageCol.append(header, stage, progressBar, progress, controls, sessionDetails, helpDetails);

  // ---- live goal tracking ----
  let goal = null; // { type: 'wpm'|'words'|'time', target: number } | null
  let wordsShown = 0;
  let activeSince = 0;
  let activeAccumMs = 0;

  function validGoal(g) {
    return !!g && ['wpm', 'words', 'time'].includes(g.type) && Number.isFinite(Number(g.target)) && Number(g.target) > 0;
  }

  function goalProgressText() {
    if (!validGoal(goal)) return '';
    const target = Number(goal.target);
    if (goal.type === 'wpm') return `Goal ${target} wpm · now ${Math.round(currentWpm)}`;
    if (goal.type === 'words') return `Goal ${target} words · read ${wordsShown}`;
    const mins = (activeAccumMs / 60000).toFixed(1);
    return `Goal ${target} min · active ${mins}`;
  }

  function renderGoal() {
    if (!validGoal(goal)) {
      goalChip.hidden = true;
      goalChip.textContent = '';
      return;
    }
    goalChip.hidden = false;
    goalChip.textContent = goalProgressText();
  }

  function setGoal(next) {
    goal = validGoal(next) ? { type: next.type, target: Number(next.target) } : null;
    goalTypeSel.value = goal ? goal.type : 'none';
    goalTargetInput.value = goal ? String(goal.target) : '';
    renderGoal();
  }

  function clearGoal() {
    setGoal(null);
  }

  // ---- rendering ----
  let nextWords = []; // words following the emitted chunk, for preview + recognition
  let recognitionPending = null;

  function renderChunk({ chunk, orpParts, lookahead }) {
    const words = chunk?.words ?? [];
    wordsShown += words.length;
    const parts = Array.isArray(orpParts) ? orpParts : [];
    nextWords = Array.isArray(lookahead) ? lookahead.map((word) => ({ word })) : [];
    const first = parts[0] ?? { left: '', orp: words[0]?.word ?? '', right: '' };
    left.textContent = first.left ?? '';
    orp.textContent = first.orp ?? '';
    const restWords = (chunk?.text ?? '').slice((first.left?.length ?? 0) + (first.orp?.length ?? 0) + (first.right?.length ?? 0));
    right.textContent = restWords;

    // Preview zone: next words sit beside the anchor in pencil (parafoveal preview practice).
    const previewWidth = Number(settings.previewWords) || 0;
    if (settings.drill && previewWidth > 0 && nextWords.length > 0) {
      const preview = document.createElement('span');
      preview.className = 'rsvp-preview';
      preview.textContent = ' ' + nextWords.slice(0, previewWidth).map((w) => w.word).join(' ');
      right.appendChild(preview);
    }

    if (SENTENCE_END.test((chunk?.text ?? '').trimEnd())) {
      announce((chunk?.text ?? '').trim());
      if (settings.drill && nextWords.length > 0 && !recognitionPending) {
        const anchor = words[words.length - 1]?.word ?? '';
        openRecognition(anchor, nextWords[0].word);
      }
    }
  }

  function openRecognition(anchorWord, expectedWord) {
    recognitionPending = { anchorWord, expectedWord };
    recognitionPrompt.textContent = `Recall check: which word followed “${anchorWord}”?`;
    recognitionInput.value = '';
    recognition.hidden = false;
    recognitionInput.focus();
  }

  recognitionForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!recognitionPending) return;
    const given = recognitionInput.value.trim().toLowerCase();
    const expected = recognitionPending.expectedWord.trim().toLowerCase();
    recognitionTotal += 1;
    if (given.length > 0 && given === expected) recognitionCorrect += 1;
    const last = given.length > 0 && given === expected ? 'correct' : 'not quite';
    recognitionScore.textContent = `${last} — recognition ${recognitionCorrect}/${recognitionTotal}`;
    recognitionPending = null;
    recognition.hidden = true;
    announce('Recognition check answered');
  });

  function fmtClock(ms) {
    const total = Math.max(0, Math.round(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function renderProgress(index) {
    progress.textContent = chunkCount > 0 ? `Chunk ${index + 1} / ${chunkCount}` : '';
    const pct = chunkCount > 0 ? Math.min(100, Math.round(((index + 1) / chunkCount) * 100)) : 0;
    progressBar.setAttribute('aria-valuenow', String(pct));
    progressFill.style.width = `${pct}%`;
    stageCounts.textContent = chunkCount > 0 ? `${pct}% · chunk ${index + 1} of ${chunkCount}` : '';
    // Honest estimate: remaining chunks at the current pace.
    const liveActive = activeAccumMs + (activeSince ? Date.now() - activeSince : 0);
    const remainingChunks = Math.max(0, chunkCount - (index + 1));
    const estPerChunk = currentWpm > 0 ? ((Number(settings.chunkSize) || 1) * 60000) / currentWpm : 0;
    stageClock.textContent = chunkCount > 0
      ? `elapsed ${fmtClock(liveActive)} · left ~${fmtClock(remainingChunks * estPerChunk)}`
      : '';
    renderGoal();
  }

  function applyStyles() {
    root.style.setProperty('--font-scale', String(settings.fontScale));
    root.style.setProperty('--text-align', settings.textAlign);
    root.style.textAlign = settings.textAlign;
    orp.style.color = settings.orpEnabled ? '' : 'inherit';
    orp.style.fontWeight = settings.orpEnabled ? 'bold' : 'normal';
    orp.style.textDecoration = settings.orpEnabled ? 'underline' : 'none';
  }

  function setSrMode(active) {
    srMode = active;
    srPanel.hidden = !active;
  }

  function renderSrSentence() {
    srSentence.textContent = sentences[sentenceIndex] ?? '';
  }

  // ---- settings wiring ----
  fontSel.addEventListener('change', () => onSettingsChange?.({ fontScale: Number(fontSel.value) }));
  alignSel.addEventListener('change', () => onSettingsChange?.({ textAlign: alignSel.value }));
  orpToggle.addEventListener('change', () => onSettingsChange?.({ orpEnabled: orpToggle.checked }));
  chunkSel.addEventListener('change', () => onSettingsChange?.({ chunkSize: Number(chunkSel.value) }));
  drillSel.addEventListener('change', () => onSettingsChange?.({ drill: drillSel.value === 'on' }));
  previewSel.addEventListener('change', () => onSettingsChange?.({ previewWords: Number(previewSel.value) }));
  motionSel.addEventListener('change', () => {
    onSettingsChange?.({ reducedMotion: motionSel.value });
    setSrMode(motionSel.value === 'on' || (motionSel.value === 'auto' && prefersReducedMotion()));
  });

  goalApply.addEventListener('click', () => {
    if (goalTypeSel.value === 'none') {
      setGoal(null);
      onGoalChange?.(null);
      return;
    }
    const next = { type: goalTypeSel.value, target: Number(goalTargetInput.value) };
    if (!validGoal(next)) {
      goalTargetInput.setAttribute('aria-invalid', 'true');
      return;
    }
    goalTargetInput.removeAttribute('aria-invalid');
    setGoal(next);
    onGoalChange?.(next);
  });

  // ---- transport ----
  playBtn.addEventListener('click', () => player?.toggle());
  prevBtn.addEventListener('click', () => player?.step(-1));
  nextBtn.addEventListener('click', () => player?.step(1));
  restartBtn.addEventListener('click', () => {
    player?.seek(0);
    player?.play();
  });
  slowerBtn.addEventListener('click', () => onSettingsChange?.({ wpm: Math.max(60, currentWpm - 25) }));
  fasterBtn.addEventListener('click', () => onSettingsChange?.({ wpm: currentWpm + 25 }));
  exitBtn.addEventListener('click', () => {
    onExit?.();
    hide();
  });
  srPrev.addEventListener('click', () => {
    sentenceIndex = Math.max(0, sentenceIndex - 1);
    renderSrSentence();
  });
  srNext.addEventListener('click', () => {
    sentenceIndex = Math.min(sentences.length - 1, sentenceIndex + 1);
    renderSrSentence();
  });

  document.addEventListener('keydown', (event) => {
    if (root.hidden) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (event.key) {
      case ' ':
        event.preventDefault();
        player?.toggle();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        player?.step(-1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        player?.step(1);
        break;
      case '+':
      case 'ArrowUp':
        event.preventDefault();
        onSettingsChange?.({ wpm: currentWpm + 25 });
        break;
      case '-':
      case 'ArrowDown':
        event.preventDefault();
        onSettingsChange?.({ wpm: Math.max(60, currentWpm - 25) });
        break;
      case 'Escape':
        event.preventDefault();
        onExit?.();
        hide();
        break;
      case 'r':
      case 'R':
        event.preventDefault();
        player?.seek(0);
        player?.play();
        break;
      case '?':
        event.preventDefault();
        helpDetails.open = !helpDetails.open;
        break;
      case 'f':
      case 'F':
        event.preventDefault();
        onFocusToggle?.();
        break;
      default:
        break;
    }
  });

  // ---- public API ----
  function start({ player: injected, text, goal: startGoal } = {}) {
    root.hidden = false;
    player = injected;
    chunkCount = 0;
    wordsShown = 0;
    activeSince = 0;
    activeAccumMs = 0;
    setGoal(startGoal ?? goal);
    // Engine state is the source of truth: a restored player may start mid-stream.
    const atIndex = injected?.getState?.().index ?? 0;
    if (atIndex > 0) {
      chunkCount = atIndex + 1;
      renderProgress(atIndex);
    }
    recognitionCorrect = 0;
    recognitionTotal = 0;
    recognitionPending = null;
    recognition.hidden = true;
    recognitionScore.textContent = '';
    header.textContent = text?.title ?? 'Reading';
    setSrMode(settings.reducedMotion === 'on' || (settings.reducedMotion === 'auto' && prefersReducedMotion()));
    sentences = splitSentencesLib(text?.text ?? '');
    sentenceIndex = 0;
    renderSrSentence();
    if (player) {
      player.on('chunk', (event) => {
        const { index, chunk, orpParts, lookahead } = event;
        chunkCount = Math.max(chunkCount, index + 1);
        renderChunk({ chunk, orpParts, lookahead });
        renderProgress(index);
      });
      player.on('state', ({ playing, wpm }) => {
        currentWpm = wpm ?? currentWpm;
        const now = Date.now();
        if (playing) {
          if (!activeSince) activeSince = now;
        } else if (activeSince) {
          activeAccumMs += now - activeSince;
          activeSince = 0;
        }
        playBtn.textContent = playing ? 'Pause' : 'Play';
        speedValue.textContent = `${Math.round(currentWpm)} wpm`;
        renderGoal();
      });
      player.on('end', () => onSessionEnd?.({
        endedAt: Date.now(),
        drill: settings.drill ? 'span' : undefined,
        recognition: settings.drill ? { correct: recognitionCorrect, total: recognitionTotal } : undefined,
      }));
      if (!srMode) player.play();
    }
  }

  function showSrText(text) {
    setSrMode(true);
    sentences = splitSentencesLib(text ?? '');
    sentenceIndex = 0;
    renderSrSentence();
  }

  function hide() {
    root.hidden = true;
    if (activeSince) {
      activeAccumMs += Date.now() - activeSince;
      activeSince = 0;
    }
    player?.pause();
  }

  function renderRail(ticks) {
    const hadTicks = railTicks.childElementCount > 0;
    railTicks.replaceChildren();
    const list = Array.isArray(ticks) ? ticks : [];
    list.forEach((tick, index) => {
      const mark = document.createElement('span');
      mark.className = 'rail-tick' + (tick.best ? ' best' : '') + (hadTicks ? ' rail-tick-new' : '');
      mark.style.width = `${Math.max(6, Math.min(28, Math.round((tick.wpm ?? 0) / 40)))}px`;
      if (hadTicks) mark.style.animationDelay = `${index * 30}ms`;
      mark.title = `Lap ${index + 1}: ${Math.round(tick.wpm ?? 0)} wpm${tick.best ? ' (best)' : ''}`;
      railTicks.appendChild(mark);
    });
  }

  function renderSettings(next) {
    settings = { ...settings, ...(next ?? {}) };
    fontSel.value = String(settings.fontScale);
    alignSel.value = settings.textAlign;
    orpToggle.checked = !!settings.orpEnabled;
    chunkSel.value = String(settings.chunkSize);
    motionSel.value = settings.reducedMotion;
    drillSel.value = settings.drill ? 'on' : 'off';
    previewSel.value = String(settings.previewWords ?? 2);
    if (typeof settings.wpm === 'number') currentWpm = settings.wpm;
    speedValue.textContent = `${Math.round(currentWpm)} wpm`;
    chunkChip.textContent = `chunk ${settings.chunkSize} word${Number(settings.chunkSize) === 1 ? '' : 's'}`;
    applyStyles();
    setSrMode(settings.reducedMotion === 'on' || (settings.reducedMotion === 'auto' && prefersReducedMotion()));
    renderProgress(Math.max(0, (player?.getState?.().index ?? 1) - 1));
  }

  applyStyles();
  root.hidden = true;

  return { start, showSrText, hide, renderSettings, renderRail, setGoal, clearGoal };
}
