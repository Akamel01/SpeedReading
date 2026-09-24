// Library (Shelf) view.
// Contract: createLibraryView(root, {onImportFile, onOpenText, onDeleteText, onExport, onImportJson, onImportUrl})
//   -> {render(texts), showPaste(hint)}
// S2: built with the shared h() DOM helper; behavior unchanged from prior revisions.

import { h } from './h.js';

export function createLibraryView(root, { onImportFile, onOpenText, onDeleteText, onExport, onImportJson, onImportUrl, onFavorite, onPrefsChange } = {}) {
  const importInput = h('input', {
    type: 'file',
    accept: '.txt,.md,.epub,.docx,.pdf',
    'aria-label': 'Import file',
    on: {
      change: () => {
        const file = importInput.files ? importInput.files[0] : null;
        if (file) {
          onImportFile?.(file);
          importInput.value = '';
        }
      },
    },
  });

  const jsonInput = h('input', { type: 'file', accept: '.json', class: 'library-json-input', hidden: 'true' });
  jsonInput.addEventListener('change', () => {
    const file = jsonInput.files ? jsonInput.files[0] : null;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        onImportJson?.(JSON.parse(String(reader.result)));
      } catch (error) {
        console.error('Invalid JSON', error);
      }
    };
    reader.readAsText(file);
    jsonInput.value = '';
  });

  const btnExport = h('button', {
    type: 'button',
    'aria-label': 'Export library',
    on: { click: () => onExport?.() },
  }, 'Export');
  const btnImportJson = h('button', {
    type: 'button',
    'aria-label': 'Import JSON',
    on: { click: () => jsonInput.click() },
  }, 'Import JSON');

  const header = h('div', { class: 'library-header' },
    importInput, ' ',
    btnExport, btnImportJson, jsonInput,
    h('span', { class: 'library-rights', 'aria-label': 'Rights notice' },
      'Use only texts you have the rights to read. DRM-protected files are not supported.'));

  const pasteArea = h('textarea', {
    class: 'library-paste-area',
    rows: '4',
    'aria-label': 'Paste text to import',
    placeholder: 'Paste article or book text here…',
  });
  const pasteHint = h('p', { class: 'library-paste-hint', hidden: 'true' });
  const pasteBtn = h('button', {
    type: 'button',
    'aria-label': 'Import pasted text',
    on: {
      click: () => {
        const text = pasteArea.value.trim();
        if (!text) {
          pasteHint.textContent = 'Paste some text first — the box is empty.';
          pasteHint.hidden = false;
          return;
        }
        pasteHint.hidden = true;
        pasteArea.value = '';
        onImportFile?.(new File([text], 'pasted.txt', { type: 'text/plain' }));
      },
    },
  }, 'Import pasted text');
  const pasteBox = h('div', { class: 'library-paste' }, pasteArea, pasteBtn, pasteHint);

  const urlInput = h('input', {
    type: 'url',
    class: 'library-url-input',
    'aria-label': 'Article URL to import',
    placeholder: 'https://example.com/article',
  });
  const urlBtn = h('button', {
    type: 'button',
    'aria-label': 'Fetch article from URL',
    on: {
      click: () => {
        const url = urlInput.value.trim();
        if (!url) {
          pasteHint.textContent = 'Enter a URL first.';
          pasteHint.hidden = false;
          return;
        }
        pasteHint.hidden = true;
        onImportUrl?.(url);
      },
    },
  }, 'Fetch URL');
  const urlBox = h('div', { class: 'library-url' }, urlInput, urlBtn);

  const list = h('ul', { class: 'library-list', 'aria-label': 'Library items' });

  const resumeBanner = h('div', { class: 'library-resume', role: 'status', hidden: 'true' });

  // Import status notices (M-P06B): success / failure / duplicate recovery.
  const notice = h('div', { class: 'library-notice', role: 'status', hidden: 'true' });

  // Shelf toolbar: search + filter + sort. Persisted via onPrefsChange.
  const searchInput = h('input', {
    type: 'search',
    class: 'library-search',
    'aria-label': 'Search shelf',
    placeholder: 'Search title…',
    on: { input: () => { prefs.search = searchInput.value; onPrefsChange?.({ ...prefs }); render(); } },
  });
  const filterSel = h('select', {
    class: 'library-filter',
    'aria-label': 'Filter shelf',
    on: { change: () => { prefs.filter = filterSel.value; onPrefsChange?.({ ...prefs }); render(); } },
  },
    h('option', { value: 'all' }, 'All'),
    h('option', { value: 'reading' }, 'Reading'),
    h('option', { value: 'completed' }, 'Completed'),
    h('option', { value: 'favourites' }, 'Favourites'));
  const sortSel = h('select', {
    class: 'library-sort',
    'aria-label': 'Sort shelf',
    on: { change: () => { prefs.sort = sortSel.value; onPrefsChange?.({ ...prefs }); render(); } },
  },
    h('option', { value: 'recent' }, 'Recent'),
    h('option', { value: 'title' }, 'Title'),
    h('option', { value: 'progress' }, 'Progress'),
    h('option', { value: 'size' }, 'Size'));
  const toolbar = h('div', { class: 'library-toolbar' }, searchInput, filterSel, sortSel);

  const container = h('div', { class: 'library-container' }, header, resumeBanner, notice, toolbar, pasteBox, urlBox, list);
  root.replaceChildren(container);

  let texts = [];
  let meta = {};
  let prefs = { search: '', filter: 'all', sort: 'recent' };

  function syncToolbar() {
    searchInput.value = prefs.search ?? '';
    filterSel.value = prefs.filter ?? 'all';
    sortSel.value = prefs.sort ?? 'recent';
  }

  function setPrefs(next) {
    prefs = { search: '', filter: 'all', sort: 'recent', ...(next ?? {}) };
    syncToolbar();
    render();
  }

  function renderEmpty() {
    list.replaceChildren(h('li', { class: 'library-empty', tabindex: '-1' }, 'Shelf is empty. Import a book to start training.'));
  }

  function renderNoResults() {
    const clear = h('button', {
      type: 'button',
      'aria-label': 'Clear search and filter',
      on: {
        click: () => {
          prefs = { search: '', filter: 'all', sort: prefs.sort ?? 'recent' };
          syncToolbar();
          onPrefsChange?.({ ...prefs });
          render();
        },
      },
    }, 'Clear search');
    list.replaceChildren(h('li', { class: 'library-empty', tabindex: '-1' }, 'Nothing matches. ', clear));
  }

  function visibleTexts() {
    const q = (prefs.search ?? '').trim().toLowerCase();
    let out = texts.filter((t) => !q || (t.title ?? '').toLowerCase().includes(q));
    const m = (id) => meta[id] ?? {};
    if (prefs.filter === 'favourites') out = out.filter((t) => t.favorite === true);
    else if (prefs.filter === 'completed') out = out.filter((t) => m(t.id).completed === true);
    else if (prefs.filter === 'reading') out = out.filter((t) => m(t.id).lastLabel && !m(t.id).completed);
    const by = {
      recent: (a, b) => (b.importedAt ?? 0) - (a.importedAt ?? 0),
      title: (a, b) => String(a.title ?? '').localeCompare(String(b.title ?? '')),
      progress: (a, b) => (m(b.id).progress ?? -1) - (m(a.id).progress ?? -1),
      size: (a, b) => (b.totalWords ?? b.wordCount ?? 0) - (a.totalWords ?? a.wordCount ?? 0),
    };
    return out.sort(by[prefs.sort] ?? by.recent);
  }

  function render(nextTexts, nextMeta) {
    if (Array.isArray(nextTexts)) texts = nextTexts;
    if (nextMeta) meta = nextMeta;
    if (texts.length === 0) {
      renderEmpty();
      return;
    }
    const shown = visibleTexts();
    if (shown.length === 0) {
      renderNoResults();
      return;
    }
    list.replaceChildren(...shown.map((text) => {
      const tm = meta[text.id] ?? {};
      const chapterSelect = Array.isArray(text.chapters) && text.chapters.length > 1
        ? h('select', { class: 'library-chapter', 'aria-label': `Chapter of ${text.title}` },
            ...text.chapters.map((chapter, index) =>
              h('option', { value: String(index) }, chapter.title || `Chapter ${index + 1}`)))
        : null;

      const openBtn = h('button', {
        type: 'button',
        'aria-label': 'Open text',
        'data-action': 'open',
        on: {
          click: () => onOpenText?.(text.id, chapterSelect ? Number(chapterSelect.value) : null),
        },
      }, 'Open');

      const favBtn = h('button', {
        type: 'button',
        'aria-label': text.favorite ? 'Remove favourite' : 'Mark favourite',
        'aria-pressed': text.favorite ? 'true' : 'false',
        'data-action': 'favourite',
        on: { click: () => onFavorite?.(text.id, !text.favorite) },
      }, text.favorite ? '★' : '☆');

      // Two-step delete: arm on first click, confirm or keep on second.
      const delWrap = h('span', { class: 'library-delete' });
      const armBtn = h('button', {
        type: 'button',
        'aria-label': 'Delete text',
        'data-action': 'delete',
        on: {
          click: () => {
            const yes = h('button', {
              type: 'button', 'aria-label': 'Confirm delete',
              on: { click: () => onDeleteText?.(text.id) },
            }, 'Delete');
            const keep = h('button', {
              type: 'button', 'aria-label': 'Keep text',
              on: { click: () => { delWrap.replaceChildren(armBtn); armBtn.focus(); } },
            }, 'Keep');
            delWrap.replaceChildren('Delete “' + (text.title ?? '') + '”? Export first if you might want it back. ', yes, ' ', keep);
            yes.focus();
          },
        },
      }, 'Delete');
      delWrap.append(armBtn);

      const words = text.totalWords ?? text.wordCount ?? 0;
      const mins = Math.max(1, Math.round(words / 300));
      const metaLine = `${words} words · ~${mins} min` + (tm.lastLabel ? ` · ${tm.lastLabel}` : ' · not started');
      const kids = [
        h('span', {}, text.title),
        h('span', { class: 'library-meta' }, ` (${text.source}, ${metaLine})`),
      ];
      if (tm.completed === true) kids.push(h('span', { class: 'library-badge' }, 'Completed'));
      if (typeof tm.progress === 'number') {
        kids.push(h('span', {
          class: 'library-progress', role: 'progressbar',
          'aria-valuenow': String(Math.round(tm.progress * 100)),
          'aria-valuemin': '0', 'aria-valuemax': '100',
          'aria-label': `Progress through ${text.title}`,
        }, `${Math.round(tm.progress * 100)}%`));
      }
      if (chapterSelect) kids.push(chapterSelect);
      kids.push(openBtn, favBtn, delWrap);
      return h('li', { class: 'library-item' }, ...kids);
    }));
  }

  function showPaste(hint) {
    pasteHint.textContent = hint;
    pasteHint.hidden = false;
    pasteArea.focus();
  }

  // Import status notices: success / failure / duplicate (with an Open action).
  function showNotice({ text, action } = {}) {
    notice.replaceChildren();
    notice.append(h('span', { class: 'library-notice-text' }, text ?? ''));
    if (action) {
      notice.append(h('button', {
        type: 'button', 'aria-label': action.label,
        on: { click: () => action.onClick?.() },
      }, action.label));
    }
    const dismiss = h('button', {
      type: 'button', 'aria-label': 'Dismiss notice',
      on: { click: () => { notice.replaceChildren(); notice.hidden = true; } },
    }, 'Dismiss');
    notice.append(dismiss);
    notice.hidden = false;
  }

  // Interrupted-session banner (M-P05B): shown when boot finds a valid snapshot.
  function showResume({ title, detail, onResume, onDismiss } = {}) {
    resumeBanner.replaceChildren();
    const text = h('span', { class: 'library-resume-text' }, `Resume — ${title}${detail ? `, ${detail}` : ''}`);
    const go = h('button', { type: 'button', 'aria-label': 'Resume interrupted session', on: { click: () => onResume?.() } }, 'Resume');
    const no = h('button', { type: 'button', 'aria-label': 'Dismiss resume', on: { click: () => { clearResume(); onDismiss?.(); } } }, 'Dismiss');
    resumeBanner.append(text, go, no);
    resumeBanner.hidden = false;
  }

  function clearResume() {
    resumeBanner.replaceChildren();
    resumeBanner.hidden = true;
  }

  return { render, showPaste, showResume, clearResume, showNotice, setPrefs };
}
