export type StoredValue = string;

export type SearchResult = {
  value: string;
  score: number;
  originalIndex?: number;
};

export type SuggestionState = {
  activeInput: HTMLInputElement | HTMLTextAreaElement | null;
  selectedIndex: number;
  results: string[];
  isOpen: boolean;
};
