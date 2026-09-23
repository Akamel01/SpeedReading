export function createLibraryView(root, {onImportFile, onOpenText, onDeleteText, onExport, onImportJson}) {
  // Build a self-contained subtree inside the provided root
  const container = document.createElement('div');
  container.className = 'library-container';

  // File input for plain text/epub imports
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = '.txt,.epub';
  importInput.setAttribute('aria-label', 'Import file');
  // Change handler calls the provided callback with the File
  importInput.addEventListener('change', (e) => {
    const f = importInput.files ? importInput.files[0] : null;
    if (f) {
      onImportFile?.(f);
      // reset input value to allow re-import of the same file if needed
      importInput.value = '';
    }
  });
  // Also render a visible input element in the DOM (the file input itself)
  container.appendChild(importInput);

  // Header with actions
  const header = document.createElement('div');
  header.className = 'library-header';

  const btnExport = document.createElement('button');
  btnExport.textContent = 'Export';
  btnExport.setAttribute('aria-label', 'Export library');
  btnExport.addEventListener('click', () => onExport?.());
  header.appendChild(btnExport);

  const btnImportJson = document.createElement('button');
  btnImportJson.textContent = 'Import JSON';
  btnImportJson.setAttribute('aria-label', 'Import JSON');
  // Hidden file input for JSON import
  const jsonInput = document.createElement('input');
  jsonInput.type = 'file';
  jsonInput.accept = '.json';
  jsonInput.style.display = 'none';
  jsonInput.addEventListener('change', (e) => {
    const f = jsonInput.files ? jsonInput.files[0] : null;
    if (f) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result));
          onImportJson?.(json);
        } catch (err) {
          console.error('Invalid JSON', err);
        }
      };
      reader.readAsText(f);
      jsonInput.value = '';
    }
  });
  btnImportJson.addEventListener('click', () => jsonInput.click());
  header.appendChild(btnImportJson);
  header.appendChild(jsonInput);

  // Rights/DRM notice
  const rightsNotice = document.createElement('span');
  rightsNotice.textContent = 'Use only texts you have the rights to read. DRM-protected files are not supported.';
  rightsNotice.style.marginLeft = '12px';
  rightsNotice.setAttribute('aria-label', 'Rights notice');
  header.appendChild(rightsNotice);

  container.appendChild(header);

  // List of texts
  const list = document.createElement('ul');
  list.className = 'library-list';
  list.setAttribute('aria-label', 'Library items');
  container.appendChild(list);

  // Attach to provided root (views own their subtree)
  root.replaceChildren(container);

  // Local state
  let texts = [];

  // Render the list of texts
  function render(newTexts) {
    texts = newTexts || [];
    // Clear list container
    list.innerHTML = '';
    if (!texts.length) {
      const empty = document.createElement('li');
      empty.className = 'library-empty';
      empty.tabIndex = -1;
      empty.textContent = 'Library is empty.';
      list.appendChild(empty);
      return;
    }
    texts.forEach((t) => {
      const item = document.createElement('li');
      item.className = 'library-item';

      const title = document.createElement('span');
      title.textContent = t.title;
      item.appendChild(title);

      const meta = document.createElement('span');
      meta.textContent = ` (${t.source}, ${t.wordCount ?? t.totalWords ?? 0} words)`;
      meta.style.marginLeft = '6px';
      item.appendChild(meta);

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.setAttribute('aria-label', 'Open text');
      openBtn.dataset.action = 'open';
      openBtn.addEventListener('click', () => onOpenText?.(t.id));
      item.appendChild(openBtn);

      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.setAttribute('aria-label', 'Delete text');
      delBtn.dataset.action = 'delete';
      delBtn.addEventListener('click', () => {
        onDeleteText?.(t.id);
        const updated = texts.filter((x) => x.id !== t.id);
        render(updated);
        // Move focus back to the list; empty state is focusable as the fallback.
        const firstOpen = list.querySelector('button[data-action="open"]');
        if (firstOpen) firstOpen.focus();
        else list.querySelector('.library-empty')?.focus();
      });
      item.appendChild(delBtn);

      list.appendChild(item);
    });
  }

  // Public API
  return {
    render
  };
}
