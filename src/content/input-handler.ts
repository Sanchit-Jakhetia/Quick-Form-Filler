import { filterSuggestions } from '../search/search.js';
import { ENABLED_STORAGE_KEY, getStoredValues, isExtensionEnabled } from '../storage/storage.js';
import { SuggestionUiState, createSuggestionUi, hideSuggestions, renderSuggestions, triggerValueSelection, updateSelection } from './suggestion-ui.js';

const supportedSelectors = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="tel"]',
  'input[type="search"]',
  'input[type="url"]',
  'textarea'
].join(', ');

const ignoredTypes = new Set(['password', 'file', 'checkbox', 'radio', 'submit', 'button', 'hidden']);

export type InputTrackerState = {
  activeInput: HTMLInputElement | HTMLTextAreaElement | null;
  currentQuery: string;
  selectedIndex: number;
  results: string[];
  isOpen: boolean;
  isEnabled: boolean;
  suppressNextInputRefresh: boolean;
  ui: SuggestionUiState;
};

export function isEligibleInput(element: HTMLElement | null): element is HTMLInputElement | HTMLTextAreaElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element instanceof HTMLInputElement && ignoredTypes.has(element.type)) {
    return false;
  }

  if (element instanceof Element && element.closest('input, textarea')) {
    const input = element.closest('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
    if (input instanceof HTMLInputElement && ignoredTypes.has(input.type)) {
      return false;
    }
    return input.matches(supportedSelectors) || input instanceof HTMLTextAreaElement;
  }

  return element instanceof HTMLTextAreaElement || element.matches(supportedSelectors);
}

export function shouldDismissSuggestionsForSelection(
  input: HTMLInputElement | HTMLTextAreaElement
): boolean {
  return (
    typeof input.selectionStart === 'number' &&
    typeof input.selectionEnd === 'number' &&
    input.selectionStart !== input.selectionEnd
  );
}

export function buildTrackerState(): InputTrackerState {
  const ui = createSuggestionUi();
  const state: InputTrackerState = {
    activeInput: null,
    currentQuery: '',
    selectedIndex: 0,
    results: [],
    isOpen: false,
    isEnabled: true,
    suppressNextInputRefresh: false,
    ui
  };

  ui.onSelect = (value: string) => {
    if (!ui.popup || ui.popup.style.display === 'none' || !state.activeInput) {
      return;
    }

    state.suppressNextInputRefresh = true;
    triggerValueSelection(state.activeInput, value);
    closeSuggestions(state);
  };

  return state;
}

function closeSuggestions(state: InputTrackerState): void {
  hideSuggestions(state.ui);
  state.results = [];
  state.selectedIndex = 0;
  state.isOpen = false;
}

export async function updateSuggestionsForInput(state: InputTrackerState, input: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  state.activeInput = input;
  if (!state.isEnabled) {
    closeSuggestions(state);
    return;
  }

  const text = input.value || '';

  if (!text) {
    state.currentQuery = '';
    state.results = [];
    state.selectedIndex = 0;
    state.isOpen = false;
    hideSuggestions(state.ui);
    return;
  }

  const values = await getStoredValues();
  const results = filterSuggestions(text, values).map((item) => item.value);
  state.currentQuery = text;
  state.results = results;
  state.selectedIndex = 0;
  state.isOpen = results.length > 0;

  if (results.length === 0) {
    hideSuggestions(state.ui);
    return;
  }

  renderSuggestions(state.ui, results, input, 0);
}

export function moveSelection(state: InputTrackerState, step: number): void {
  if (!state.isOpen || !state.results.length || !state.ui.popup || state.ui.popup.style.display === 'none') {
    return;
  }

  const total = state.results.length;
  state.selectedIndex = (state.selectedIndex + step + total) % total;
  updateSelection(state.ui, state.selectedIndex);
}

export function acceptSelection(state: InputTrackerState): void {
  if (!state.isOpen || !state.activeInput || !state.results.length || !state.ui.popup || state.ui.popup.style.display === 'none') {
    return;
  }

  const value = state.results[state.selectedIndex];
  if (!value) {
    return;
  }

  state.suppressNextInputRefresh = true;
  triggerValueSelection(state.activeInput, value);
  closeSuggestions(state);
}

export function handleKeyNavigation(state: InputTrackerState, event: KeyboardEvent): void {
  if (!state.activeInput) {
    return;
  }

  if (event.key === 'ArrowDown' && state.isOpen) {
    event.preventDefault();
    moveSelection(state, 1);
    return;
  }

  if (event.key === 'ArrowUp' && state.isOpen) {
    event.preventDefault();
    moveSelection(state, -1);
    return;
  }

  if (event.key === 'Enter') {
    if (state.isOpen && state.results.length && state.ui.popup && state.ui.popup.style.display !== 'none') {
      event.preventDefault();
      acceptSelection(state);
    }
    return;
  }

  if (event.key === 'Escape') {
    closeSuggestions(state);
  }
}

export function attachInputHandlers(): InputTrackerState {
  const state = buildTrackerState();
  void isExtensionEnabled().then((enabled) => {
    state.isEnabled = enabled;
    if (!enabled) {
      closeSuggestions(state);
    }
  });

  const onFocusIn = (event: Event) => {
    if (!state.isEnabled) {
      return;
    }

    const target = event.target;
    if (isEligibleInput(target as HTMLElement)) {
      state.activeInput = target as HTMLInputElement | HTMLTextAreaElement;
    }
  };

  const onInput = async (event: Event) => {
    if (!state.isEnabled) {
      closeSuggestions(state);
      return;
    }

    if (state.suppressNextInputRefresh) {
      state.suppressNextInputRefresh = false;
      closeSuggestions(state);
      return;
    }

    const target = event.target;
    if (!isEligibleInput(target as HTMLElement)) {
      return;
    }
    await updateSuggestionsForInput(state, target as HTMLInputElement | HTMLTextAreaElement);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!state.activeInput) {
      return;
    }
    handleKeyNavigation(state, event);
  };

  const onStorageChanged = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName !== 'local' || !changes[ENABLED_STORAGE_KEY]) {
      return;
    }

    state.isEnabled = changes[ENABLED_STORAGE_KEY].newValue !== false;
    if (!state.isEnabled) {
      closeSuggestions(state);
      return;
    }

    if (state.activeInput && isEligibleInput(state.activeInput)) {
      void updateSuggestionsForInput(state, state.activeInput);
    }
  };

  const onDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!target || !(target instanceof Element)) {
      closeSuggestions(state);
      return;
    }

    if (state.ui.host && state.ui.host.contains(target)) {
      return;
    }

    if (state.activeInput && state.activeInput.contains(target)) {
      return;
    }

    closeSuggestions(state);
  };

  const onBlur = (event: FocusEvent) => {
    const target = event.target;
    if (target === state.activeInput) {
      setTimeout(() => {
        if (document.activeElement !== state.activeInput) {
          closeSuggestions(state);
        }
      }, 0);
    }
  };

  const onSelectionChange = () => {
    if (!state.activeInput || !state.isOpen) {
      return;
    }

    if (shouldDismissSuggestionsForSelection(state.activeInput)) {
      closeSuggestions(state);
    }
  };

  const onViewportChange = () => {
    if (state.isOpen && state.activeInput) {
      renderSuggestions(state.ui, state.results, state.activeInput, state.selectedIndex);
    }
  };

  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('input', onInput as EventListener);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onDocumentClick);
  document.addEventListener('focusout', onBlur);
  document.addEventListener('selectionchange', onSelectionChange);
  window.addEventListener('scroll', onViewportChange, true);
  window.addEventListener('resize', onViewportChange);
  chrome.storage.onChanged?.addListener(onStorageChanged);

  return state;
}
