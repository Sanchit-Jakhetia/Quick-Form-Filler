import { SearchResult } from '../shared/types.js';

export const MAX_SUGGESTIONS = 8;

export function normalizeForMatch(value: string): string {
  return value.trim();
}

export function matchesPrefix(query: string, candidate: string): boolean {
  if (!query) {
    return true;
  }
  return normalizeForMatch(candidate).startsWith(normalizeForMatch(query));
}

export function rankSuggestions(suggestions: SearchResult[], query: string): SearchResult[] {
  const normalizedQuery = normalizeForMatch(query);

  return [...suggestions]
    .map((item, index) => {
      const normalizedValue = normalizeForMatch(item.value);
      let score = 0;

      if (normalizedValue === normalizedQuery) {
        score -= 1000;
      } else if (normalizedValue.startsWith(normalizedQuery)) {
        score -= 500;
      }

      score += item.value.length;
      return { ...item, originalIndex: index, score: score + (item.score ?? 0) };
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      return a.originalIndex - b.originalIndex;
    });
}

export function filterSuggestions(query: string, values: string[], maxSuggestions = MAX_SUGGESTIONS): SearchResult[] {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    if (!matchesPrefix(normalizedQuery, value)) {
      continue;
    }

    const key = normalizeForMatch(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push({ value, score: value.length });
  }

  return rankSuggestions(results, normalizedQuery).slice(0, maxSuggestions);
}
