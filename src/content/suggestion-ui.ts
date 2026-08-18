import { MAX_SUGGESTIONS } from '../search/search.js';

export type SuggestionUiState = {
  host: HTMLDivElement | null;
  popup: HTMLDivElement | null;
  list: HTMLDivElement | null;
  items: HTMLButtonElement[];
  onSelect: ((value: string) => void) | null;
};

export function createSuggestionUi(): SuggestionUiState {
  const host = document.createElement('div');
  host.setAttribute('data-quick-form-filler', 'suggestions');
  host.style.position = 'fixed';
  host.style.inset = '0 auto auto 0';
  host.style.width = '0';
  host.style.height = '0';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';

  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    .quick-form-filler-popup {
      position: fixed;
      background: rgba(19, 24, 32, 0.98);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 8px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
      box-sizing: border-box;
      overflow: hidden;
      color: #f3f4f6;
      font: 14px/1.4 Arial, sans-serif;
      z-index: 2147483647;
      min-width: 180px;
      pointer-events: auto;
    }

    .quick-form-filler-list {
      display: flex;
      flex-direction: column;
      max-height: 220px;
      overflow-y: auto;
    }

    .quick-form-filler-suggestion {
      background: transparent;
      border: 0;
      color: inherit;
      text-align: left;
      padding: 8px 10px;
      cursor: pointer;
      font: inherit;
      letter-spacing: 0;
      min-height: 32px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .quick-form-filler-suggestion:hover,
    .quick-form-filler-suggestion.selected {
      background: rgba(37, 99, 235, 0.34);
    }
  `;

  const popup = document.createElement('div');
  popup.className = 'quick-form-filler-popup';
  popup.setAttribute('role', 'listbox');
  popup.setAttribute('aria-live', 'polite');
  popup.style.position = 'absolute';
  popup.style.zIndex = '2147483647';
  popup.style.display = 'none';
  popup.style.pointerEvents = 'auto';

  const list = document.createElement('div');
  list.className = 'quick-form-filler-list';
  popup.appendChild(list);

  root.appendChild(style);
  root.appendChild(popup);
  document.body.appendChild(host);

  return { host, popup, list, items: [], onSelect: null };
}

export function renderSuggestions(ui: SuggestionUiState, values: string[], activeInput: HTMLInputElement | HTMLTextAreaElement | null, selectedIndex = 0): void {
  if (!ui.popup || !ui.list || !activeInput) {
    return;
  }

  ui.list.innerHTML = '';
  ui.items = [];

  if (!values.length) {
    hideSuggestions(ui);
    return;
  }

  const limited = values.slice(0, MAX_SUGGESTIONS);

  for (const value of limited) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-form-filler-suggestion';
    btn.textContent = value;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', 'false');
    btn.addEventListener('mousedown', (event) => {
      event.preventDefault();
      ui.onSelect?.(value);
    });
    ui.list.appendChild(btn);
    ui.items.push(btn);
  }

  updateSelection(ui, selectedIndex);
  positionPopup(ui, activeInput);
  ui.popup.style.display = 'block';
}

export function updateSelection(ui: SuggestionUiState, selectedIndex: number): void {
  if (!ui.items.length) {
    return;
  }

  const boundedIndex = Math.max(0, Math.min(selectedIndex, ui.items.length - 1));
  ui.items.forEach((item, index) => {
    const isSelected = index === boundedIndex;
    item.classList.toggle('selected', isSelected);
    item.setAttribute('aria-selected', String(isSelected));
  });
}

export function hideSuggestions(ui: SuggestionUiState): void {
  if (ui.popup) {
    ui.popup.style.display = 'none';
  }
}

export function positionPopup(ui: SuggestionUiState, activeInput: HTMLInputElement | HTMLTextAreaElement): void {
  if (!ui.popup) {
    return;
  }

  const rect = activeInput.getBoundingClientRect();
  const estimatedHeight = Math.min(ui.items.length * 32 + 12, 220);
  const preferredTop = rect.bottom + 8;
  const preferredBottom = preferredTop + estimatedHeight;
  const viewportHeight = window.innerHeight;
  const top = preferredBottom > viewportHeight - 12 ? rect.top - estimatedHeight - 8 : preferredTop;
  const popupWidth = Math.max(rect.width, 180);
  const maxLeft = Math.max(8, window.innerWidth - popupWidth - 8);

  ui.popup.style.left = `${Math.min(Math.max(8, rect.left), maxLeft)}px`;
  ui.popup.style.top = `${Math.max(8, top)}px`;
  ui.popup.style.minWidth = `${popupWidth}px`;
  ui.popup.style.maxWidth = `${Math.max(180, window.innerWidth - 16)}px`;
}

export function triggerValueSelection(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

  const setter = input instanceof HTMLTextAreaElement ? nativeTextAreaValueSetter : nativeInputValueSetter;

  if (setter) {
    setter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  const nativeInput = input as HTMLInputElement;
  if ('value' in nativeInput) {
    nativeInput.value = value;
  }

  if (input.type !== 'number' && typeof input.selectionStart === 'number') {
    input.setSelectionRange(value.length, value.length);
  }
}
