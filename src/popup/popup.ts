import { addStoredValue, deleteStoredValue, getStoredValues, importStoredValues, isExtensionEnabled, normalizeStoredValue, setExtensionEnabled, updateStoredValue } from '../storage/storage.js';

const listElement = document.querySelector('#value-list') as HTMLUListElement | null;
const inputElement = document.querySelector('#value-input') as HTMLInputElement | null;
const addButton = document.querySelector('#add-button') as HTMLButtonElement | null;
const toggleButton = document.querySelector('#toggle-button') as HTMLButtonElement | null;
const importFileElement = document.querySelector('#import-file') as HTMLInputElement | null;
const exportButton = document.querySelector('#export-button') as HTMLButtonElement | null;
const statusElement = document.querySelector('#status') as HTMLDivElement | null;

function setStatus(message: string): void {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

function renderEnabledState(enabled: boolean): void {
  if (!toggleButton) {
    return;
  }

  toggleButton.textContent = enabled ? 'On' : 'Off';
  toggleButton.classList.toggle('is-off', !enabled);
  toggleButton.setAttribute('aria-pressed', String(enabled));
  toggleButton.title = enabled ? 'Quick Form Filler is on. Shortcut: Alt+V' : 'Quick Form Filler is off. Shortcut: Alt+V';
}

async function refreshEnabledState(): Promise<void> {
  renderEnabledState(await isExtensionEnabled());
}

function parseImportedValues(fileName: string, content: string): string[] {
  const trimmedContent = content.trim();
  if (!trimmedContent) {
    return [];
  }

  const looksJson = fileName.toLocaleLowerCase().endsWith('.json') || trimmedContent.startsWith('[');
  if (looksJson) {
    const parsed = JSON.parse(trimmedContent) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error('JSON file must contain an array of strings.');
    }

    return parsed.filter((value): value is string => typeof value === 'string');
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function handleImportFile(file: File): Promise<void> {
  const before = await getStoredValues();
  const imported = parseImportedValues(file.name, await file.text());

  if (!imported.length) {
    setStatus('No values found in that file.');
    return;
  }

  const next = await importStoredValues(imported);
  const addedCount = next.length - before.length;
  setStatus(`Imported ${addedCount} new value${addedCount === 1 ? '' : 's'}.`);
  await refreshValues();
}

async function handleExport(): Promise<void> {
  const values = await getStoredValues();
  const blob = new Blob([`${JSON.stringify(values, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'quick-form-filler-values.json';
  link.click();
  URL.revokeObjectURL(url);
  setStatus('Exported saved values.');
}

async function refreshValues(): Promise<void> {
  if (!listElement) {
    return;
  }

  const values = await getStoredValues();
  listElement.innerHTML = '';

  for (const value of values) {
    const item = document.createElement('li');
    item.className = 'value-item';

    const text = document.createElement('span');
    text.className = 'value-text';
    text.textContent = value;

    const actions = document.createElement('div');
    actions.className = 'value-actions';

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.textContent = 'Edit';
    editButton.addEventListener('click', async () => {
      const editedValue = window.prompt('Edit saved value:', value);
      if (editedValue === null) {
        return;
      }

      const trimmed = editedValue.trim();
      if (!trimmed) {
        setStatus('Value cannot be empty.');
        return;
      }

      const existing = await getStoredValues();
      const duplicate = existing.some((item) => item !== value && normalizeStoredValue(item) === normalizeStoredValue(trimmed));
      if (duplicate) {
        setStatus('Duplicate value not saved.');
        return;
      }

      await updateStoredValue(value, trimmed);
      setStatus('Value updated.');
      await refreshValues();
    });

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'delete';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', async () => {
      await deleteStoredValue(value);
      setStatus('Value deleted.');
      await refreshValues();
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    item.appendChild(text);
    item.appendChild(actions);
    listElement.appendChild(item);
  }

  if (!values.length) {
    const empty = document.createElement('li');
    empty.className = 'value-item';
    empty.textContent = 'No values saved yet.';
    listElement.appendChild(empty);
  }
}

async function handleAdd(): Promise<void> {
  if (!inputElement) {
    return;
  }

  const value = inputElement.value.trim();
  if (!value) {
    setStatus('Enter a value to save.');
    return;
  }

  const existing = await getStoredValues();
  if (existing.some((item) => normalizeStoredValue(item) === normalizeStoredValue(value))) {
    setStatus('Duplicate value not added.');
    return;
  }

  await addStoredValue(value);
  inputElement.value = '';
  setStatus('Value saved locally.');
  await refreshValues();
}

if (addButton) {
  addButton.addEventListener('click', handleAdd);
}

if (toggleButton) {
  toggleButton.addEventListener('click', async () => {
    const enabled = !(await isExtensionEnabled());
    await setExtensionEnabled(enabled);
    renderEnabledState(enabled);
    setStatus(`Extension turned ${enabled ? 'on' : 'off'}.`);
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.quickFormFillerEnabled) {
    renderEnabledState(changes.quickFormFillerEnabled.newValue !== false);
  }
});

if (inputElement) {
  inputElement.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      await handleAdd();
    }
  });
}

if (importFileElement) {
  importFileElement.addEventListener('change', async () => {
    const file = importFileElement.files?.[0];
    if (!file) {
      return;
    }

    try {
      await handleImportFile(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not import that file.';
      setStatus(message);
    } finally {
      importFileElement.value = '';
    }
  });
}

if (exportButton) {
  exportButton.addEventListener('click', handleExport);
}

void refreshEnabledState();
void refreshValues();
