// RSVP player view: ORP-anchored renderer, keyboard map, SR/reduced-motion mode, settings controls.
// Consumes an INJECTED player (src/lib/player.js); never creates timers or players.
// Contract: createPlayerView(root, {onSessionEnd, onExit, onSettingsChange})
//   -> {start({player, text}), showSrText(text), hide(), renderSettings(settings)}

import { announce, prefersReducedMotion } from './a11y.js';
import { splitSentences as splitSentencesLib } from '../lib/text.js';

const SENTENCE_END = /[.!?]["')\]]*\s*$/;


export function createPlayerView(root, { onSessionEnd, onExit, onSettingsChange } = {}) {
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

  const stage = document.createElement('div');
  stage.className = 'rsvp-stage';
  stage.setAttribute('aria-hidden', 'true');
  const left = document.createElement('span');
  left.className = 'rsvp-left';
  const orp = document.createElement('span');
  orp.className = 'rsvp-orp';
  const right = document.createElement('span');
  right.className = 'rsvp-right';
  stage.append(left, orp, right);

  const progress = document.createElement('p');
  progress.className = 'player-progress';

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
  const slowerBtn = makeButton('−', 'slower');
  const fasterBtn = makeButton('+', 'faster');
  const exitBtn = makeButton('Exit', 'exit');

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
  const rail = document.createElement('div');
  rail.className = 'player-rail';
  rail.setAttribute('aria-label', 'Session margin');

  const pageCol = document.createElement('div');
  pageCol.className = 'player-page';

  // Views own their subtree: replace any shell placeholder content.
  root.replaceChildren(rail, pageCol, srPanel, recognition);
  pageCol.append(header, stage, progress, controls, settingsRow);

  // ---- rendering ----
  let nextWords = []; // words following the emitted chunk, for preview + recognition
  let recognitionPending = null;

  function renderChunk({ chunk, orpParts, lookahead }) {
    const words = chunk?.words ?? [];
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

  function renderProgress(index) {
    progress.textContent = chunkCount > 0 ? `Chunk ${index + 1} / ${chunkCount}` : '';
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

  // ---- transport ----
  playBtn.addEventListener('click', () => player?.toggle());
  prevBtn.addEventListener('click', () => player?.step(-1));
  nextBtn.addEventListener('click', () => player?.step(1));
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
      default:
        break;
    }
  });

  // ---- public API ----
  function start({ player: injected, text }) {
    root.hidden = false;
    player = injected;
    chunkCount = 0;
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
        playBtn.textContent = playing ? 'Pause' : 'Play';
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
    player?.pause();
  }

  function renderRail(ticks) {
    const hadTicks = rail.childElementCount > 0;
    rail.replaceChildren();
    const list = Array.isArray(ticks) ? ticks : [];
    list.forEach((tick, index) => {
      const mark = document.createElement('span');
      mark.className = 'rail-tick' + (tick.best ? ' best' : '') + (hadTicks ? ' rail-tick-new' : '');
      mark.style.width = `${Math.max(6, Math.min(28, Math.round((tick.wpm ?? 0) / 40)))}px`;
      if (hadTicks) mark.style.animationDelay = `${index * 30}ms`;
      mark.title = `Lap ${index + 1}: ${Math.round(tick.wpm ?? 0)} wpm${tick.best ? ' (best)' : ''}`;
      rail.appendChild(mark);
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
    applyStyles();
    setSrMode(settings.reducedMotion === 'on' || (settings.reducedMotion === 'auto' && prefersReducedMotion()));
    renderProgress(Math.max(0, (player?.getState?.().index ?? 1) - 1));
  }

  applyStyles();
  root.hidden = true;

  return { start, showSrText, hide, renderSettings, renderRail };
}
