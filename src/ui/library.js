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
    class: 'btn quiet',
    'aria-label': 'Export library',
    on: { click: () => onExport?.() },
  }, 'Export data');
  const btnImportJson = h('button', {
    type: 'button',
    class: 'btn quiet',
    'aria-label': 'Import JSON',
    on: { click: () => jsonInput.click() },
  }, 'Import JSON');

  // Header shell: title + counts + actions (prototype: header.shell).
  const counts = h('p', { class: 'library-counts muted' });
  importInput.id = 'library-file';
  importInput.hidden = true;
  const importLabel = h('label', { class: 'btn primary library-import-btn', for: 'library-file' }, 'Import');
  const header = h('header', { class: 'library-header shell' },
    h('div', { class: 'library-header-text' },
      h('h2', { class: 'library-heading' }, 'Library'),
      counts),
    h('div', { class: 'library-header-actions' },
      importLabel, importInput, btnImportJson, btnExport, jsonInput));

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
  const pasteBox = h('div', { class: 'library-paste' }, pasteArea, pasteBtn);

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

  // Import card (prototype): dropzone + URL/paste row + formats + rights copy.
  const dropzone = h('div', { class: 'library-dropzone' },
    h('p', { class: 'library-dropzone-main' },
      h('strong', {}, 'Drop a file here'), ' or ',
      h('label', { class: 'library-choose', for: 'library-file' }, 'choose a file')),
    h('p', { class: 'muted' }, '.txt · .md · .epub (DRM-free) · .docx · .pdf (text-based) — up to 10 MB per file'));
  const importCard = h('section', { class: 'card library-import', 'aria-label': 'Import surface' },
    h('h2', {}, 'Import'),
    dropzone,
    pasteBox,
    urlBox,
    pasteHint,
    h('p', { class: 'library-rights muted', 'aria-label': 'Rights notice' },
      'Import only texts you have the rights to read. DRM-protected files are not supported and are never circumvented. Text and progress stay in your browser; nothing is uploaded.'));

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

  const deleteNote = h('p', { class: 'library-delete-note muted' },
    'Delete asks for confirmation; export your data first if you might want it back.');
  const listCard = h('section', { class: 'card library-list-card', 'aria-label': 'Library list' },
    toolbar, list, deleteNote);

  const container = h('div', { class: 'library-container wrap' },
    header, resumeBanner, notice, importCard, listCard);
  root.replaceChildren(container);

  let texts = [];
  let meta = {};
  let stats = null;
  let prefs = { search: '', filter: 'all', sort: 'recent' };

  function syncToolbar() {
    searchInput.value = prefs.search ?? '';
    filterSel.value = prefs.filter ?? 'all';
    sortSel.value = prefs.sort ?? 'recent';
  }

  function renderCounts() {
    const words = texts.reduce((sum, t) => sum + (t.totalWords ?? t.wordCount ?? 0), 0);
    const n = stats?.sessions ?? 0;
    counts.textContent = `${texts.length} text${texts.length === 1 ? '' : 's'} · ${words.toLocaleString('en-US')} words · ${n} session${n === 1 ? '' : 's'}`;
  }

  function setPrefs(next) {
    prefs = { search: '', filter: 'all', sort: 'recent', ...(next ?? {}) };
    syncToolbar();
    render();
  }

  function renderEmpty() {
    const cta = h('button', {
      type: 'button', class: 'btn primary',
      on: { click: () => importInput.click() },
    }, 'Import a text');
    list.replaceChildren(h('li', { class: 'library-empty library-empty-state' },
      h('h3', {}, 'First use'),
      h('p', { class: 'muted' }, 'Your library is empty. Import a text to begin your ledger.'),
      cta));
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
    const query = (prefs.search ?? '').trim();
    list.replaceChildren(h('li', { class: 'library-empty library-empty-state' },
      h('h3', {}, 'No results'),
      h('p', { class: 'muted' }, query
        ? `Nothing matches “${query}”. Clear the search or change the filter.`
        : 'Nothing matches the current filter. Clear it to see your texts.'),
      clear));
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

  function render(nextTexts, nextMeta, nextStats) {
    if (Array.isArray(nextTexts)) texts = nextTexts;
    if (nextMeta) meta = nextMeta;
    if (nextStats) stats = nextStats;
    renderCounts();
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
        class: 'btn',
        'aria-label': 'Open text',
        'data-action': 'open',
        on: {
          click: () => onOpenText?.(text.id, chapterSelect ? Number(chapterSelect.value) : null),
        },
      }, 'Open');

      const favBtn = h('button', {
        type: 'button',
        class: 'btn quiet library-fav',
        'aria-label': text.favorite ? 'Remove favourite' : 'Mark favourite',
        'aria-pressed': text.favorite ? 'true' : 'false',
        'data-action': 'favourite',
        on: { click: () => onFavorite?.(text.id, !text.favorite) },
      }, text.favorite ? '★ Favourite' : '☆ Favourite');

      // Two-step delete: arm on first click, confirm or keep on second.
      const delWrap = h('span', { class: 'library-delete' });
      const armBtn = h('button', {
        type: 'button',
        class: 'btn danger',
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
      const pct = typeof tm.progress === 'number' ? Math.round(tm.progress * 100) : 0;
      const badge = [];
      if (tm.completed === true) badge.push(h('span', { class: 'library-badge library-badge-done' }, 'Completed'));
      if (tm.mastery) badge.push(h('span', { class: 'library-badge library-badge-mastery' }, `Best ${Math.round(tm.mastery.wpm)} wpm · ${Math.round(tm.mastery.comprehensionPct)}%`));
      const body = h('div', { class: 'library-item-body' },
        h('h3', { class: 'library-title' }, text.title,
          text.favorite === true ? h('span', { class: 'library-fav-star', 'aria-hidden': 'true' }, ' ★') : null),
        h('div', { class: 'library-meta' },
          h('span', { class: 'data' }, `${words.toLocaleString('en-US')} words`), ' · ',
          h('span', {}, `~${mins} min`), ' · ',
          h('span', {}, tm.lastLabel || 'not started'), ' · ',
          h('span', {}, text.source ?? 'txt')),
        badge.length > 0 ? h('div', { class: 'library-badges' }, ...badge) : null,
        h('div', {
          class: 'library-progress', role: 'progressbar',
          'aria-valuenow': String(pct), 'aria-valuemin': '0', 'aria-valuemax': '100',
          'aria-label': `Progress through ${text.title} ${pct}%`,
        }, h('span', { style: `width:${pct}%` })),
        h('div', { class: 'library-meta muted' },
          h('span', { class: 'data' }, `${pct}%`), ' · ',
          h('span', {}, `${tm.laps ?? 0} lap${(tm.laps ?? 0) === 1 ? '' : 's'}`)));
      const actions = h('div', { class: 'library-actions' }, chapterSelect, openBtn, favBtn, delWrap);
      const cover = h('div', { class: 'library-cover', 'aria-hidden': 'true' },
        String(text.title ?? '?').trim().charAt(0).toUpperCase() || '?');
      return h('li', { class: 'library-item' }, cover, body, actions);
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
