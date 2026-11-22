// Grocerly UI, section management, item selection and local persistence.
(function () {
  'use strict';

  const STORAGE_KEY = 'grocerly-sections-v2'; // Preserve existing saved lists.
  const element = id => document.getElementById(id);
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
  const data = { sections: [], items: [] };

  function notify(message) {
    const toast = element('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(notify.timeout);
    notify.timeout = setTimeout(() => { toast.style.display = 'none'; }, 2300);
  }

  function loadData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.sections) && Array.isArray(saved.items)) {
        data.sections = saved.sections.filter(section =>
          section && typeof section.id === 'string' && typeof section.name === 'string'
        );
        data.items = saved.items.filter(item =>
          item && typeof item.name === 'string' && typeof item.sectionId === 'string'
        ).map(item => ({ ...item, done: Boolean(item.done) }));
        return;
      }

      // Migrate the older single-list version if it exists.
      const legacy = JSON.parse(localStorage.getItem('grocerly-items-v1') || '[]');
      if (!Array.isArray(legacy)) return;
      data.items = legacy.filter(item => item && typeof item.name === 'string')
        .map(item => ({
          id: String(item.id || newId()), name: item.name,
          done: Boolean(item.done), sectionId: 'general'
        }));
      if (data.items.length) data.sections = [{ id: 'general', name: 'General' }];
    } catch {
      notify('Could not read saved list');
    }
  }

  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      notify('Browser storage unavailable');
    }
  }

  function createSection(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (data.sections.some(section => section.name.toLowerCase() === trimmed.toLowerCase())) {
      notify('Section already exists');
      return;
    }
    const section = { id: newId(), name: trimmed };
    data.sections.push(section);
    saveData();
    render();
    element('category').value = section.id;
    notify('Section created');
  }

  function createItem(name, sectionId) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!data.sections.some(section => section.id === sectionId)) {
      notify('Select a section');
      return;
    }
    if (data.items.some(item => item.sectionId === sectionId &&
        item.name.toLowerCase() === trimmed.toLowerCase())) {
      notify('Item already exists in this section');
      return;
    }
    data.items.push({ id: newId(), name: trimmed, done: false, sectionId });
    saveData();
    render();
  }

  function removeSection(section, itemCount) {
    if (!confirm(`Delete section "${section.name}" and its ${itemCount} item(s)?`)) return;
    data.sections = data.sections.filter(entry => entry.id !== section.id);
    data.items = data.items.filter(item => item.sectionId !== section.id);
    saveData();
    render();
  }

  function removeItem(itemId) {
    data.items = data.items.filter(item => item.id !== itemId);
    saveData();
    render();
  }

  function createSectionElement(section) {
    const items = data.items.filter(item => item.sectionId === section.id);
    const container = document.createElement('section');
    container.className = 'section';

    const header = document.createElement('div');
    header.className = 'sectionhead';
    const title = document.createElement('h3');
    title.textContent = section.name;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = `${items.filter(item => item.done).length}/${items.length}`;
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete';
    deleteButton.textContent = '×';
    deleteButton.title = `Delete section ${section.name}`;
    deleteButton.setAttribute('aria-label', deleteButton.title);
    deleteButton.onclick = () => removeSection(section, items.length);
    header.append(title, count, deleteButton);
    container.append(header);

    const list = document.createElement('div');
    list.className = 'items';
    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items in this section yet';
      list.append(empty);
    }

    for (const item of items) {
      const row = document.createElement('div');
      row.className = 'item' + (item.done ? ' selected' : '');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = item.done;
      checkbox.setAttribute('aria-label', `Include ${item.name} in export`);
      checkbox.onchange = () => {
        item.done = checkbox.checked;
        saveData();
        render();
      };
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = item.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'delete';
      remove.textContent = '×';
      remove.title = `Remove ${item.name}`;
      remove.setAttribute('aria-label', remove.title);
      remove.onclick = () => removeItem(item.id);
      row.append(checkbox, name, remove);
      list.append(row);
    }
    container.append(list);
    return container;
  }

  function render() {
    const select = element('category');
    const previousSelection = select.value;
    select.replaceChildren();
    if (data.sections.length === 0) {
      const placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Create a section first';
      select.append(placeholder);
    }
    for (const section of data.sections) {
      const option = document.createElement('option');
      option.value = section.id;
      option.textContent = section.name;
      select.append(option);
    }
    if (data.sections.some(section => section.id === previousSelection)) {
      select.value = previousSelection;
    }
    element('entry').disabled = data.sections.length === 0;
    element('itemform').querySelector('button').disabled = data.sections.length === 0;

    const list = element('sections');
    list.replaceChildren(...data.sections.map(createSectionElement));
    const selected = GrocerlyExport.groupedSelections(data)
      .reduce((total, section) => total + section.items.length, 0);
    element('count').textContent = data.items.length;
    element('status').textContent =
      `${selected} of ${data.items.length} items selected · ${data.sections.length} sections`;
    element('bar').style.width = (data.items.length ? 100 * selected / data.items.length : 0) + '%';
    for (const id of ['copy', 'image', 'pdf']) element(id).disabled = selected === 0;
  }

  function bindEvents() {
    element('sectionform').onsubmit = event => {
      event.preventDefault();
      createSection(element('sectionentry').value);
      element('sectionentry').value = '';
      element('sectionentry').focus();
    };
    element('itemform').onsubmit = event => {
      event.preventDefault();
      createItem(element('entry').value, element('category').value);
      element('entry').value = '';
      element('entry').focus();
    };
    element('clear').onclick = () => {
      if (!data.items.length || !confirm('Remove all items from every section? Your sections will remain.')) return;
      data.items = [];
      saveData();
      render();
    };
    element('copy').onclick = async () => {
      const groups = GrocerlyExport.groupedSelections(data);
      if (!groups.length) return;
      const success = await GrocerlyExport.copyText(groups);
      notify(success ? 'Copied to clipboard!' : 'Copy unavailable');
    };
    element('image').onclick = async () => {
      const groups = GrocerlyExport.groupedSelections(data);
      if (!groups.length) return;
      try {
        await GrocerlyExport.saveImage(groups);
        notify('Image saved!');
      } catch {
        notify('Image failed');
      }
    };
    element('pdf').onclick = () => {
      const groups = GrocerlyExport.groupedSelections(data);
      if (!groups.length) return;
      if (!GrocerlyExport.savePdf(groups)) notify('Allow pop-ups to save PDF');
    };
  }

  loadData();
  bindEvents();
  render();
  saveData();

  // Install offline support only when served over HTTPS (not from a file:// URL).
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
