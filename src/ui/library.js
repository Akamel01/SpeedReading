// Library (Shelf) view.
// Contract: createLibraryView(root, {onImportFile, onOpenText, onDeleteText, onExport, onImportJson, onImportUrl})
//   -> {render(texts), showPaste(hint)}
// S2: built with the shared h() DOM helper; behavior unchanged from prior revisions.

import { h } from './h.js';

export function createLibraryView(root, { onImportFile, onOpenText, onDeleteText, onExport, onImportJson, onImportUrl } = {}) {
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

  const container = h('div', { class: 'library-container' }, header, pasteBox, urlBox, list);
  root.replaceChildren(container);

  let texts = [];

  function renderEmpty() {
    const empty = h('li', { class: 'library-empty', tabindex: '-1' }, 'Shelf is empty. Import a book to start training.');
    list.replaceChildren(empty);
  }

  function render(nextTexts) {
    texts = nextTexts || [];
    if (texts.length === 0) {
      renderEmpty();
      return;
    }
    list.replaceChildren(...texts.map((text) => {
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

      const delBtn = h('button', {
        type: 'button',
        'aria-label': 'Delete text',
        'data-action': 'delete',
        on: {
          click: () => {
            onDeleteText?.(text.id);
            const updated = texts.filter((candidate) => candidate.id !== text.id);
            render(updated);
            const firstOpen = list.querySelector('button[data-action="open"]');
            if (firstOpen) firstOpen.focus();
            else list.querySelector('.library-empty')?.focus();
          },
        },
      }, 'Delete');

      return h('li', { class: 'library-item' },
        h('span', {}, text.title),
        h('span', { class: 'library-meta' }, ` (${text.source}, ${text.wordCount ?? text.totalWords ?? 0} words)`),
        chapterSelect,
        openBtn,
        delBtn);
    }));
  }

  function showPaste(hint) {
    pasteHint.textContent = hint;
    pasteHint.hidden = false;
    pasteArea.focus();
  }

  return { render, showPaste };
}
