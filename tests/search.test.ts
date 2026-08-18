import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSuggestions, rankSuggestions } from '../src/search/search.js';
import { deduplicateValues } from '../src/storage/storage.js';

test('prefix matching is case-sensitive', () => {
  const values = ['Alex Example', 'Alex', 'AlexExample', '120045006789'];
  const result = filterSuggestions('Alex', values);
  assert.deepEqual(result.map((item) => item.value), ['Alex', 'AlexExample', 'Alex Example']);
});

test('different casing does not match', () => {
  const values = ['Alex Example', 'alex'];
  const result = filterSuggestions('alex', values);
  assert.deepEqual(result.map((item) => item.value), ['alex']);
});

test('numeric prefix matching works', () => {
  const values = ['120045006789', '1201000000'];
  const result = filterSuggestions('120', values);
  assert.deepEqual(result.map((item) => item.value), ['1201000000', '120045006789']);
});

test('ranking keeps exact prefix matches first', () => {
  const suggestions = [
    { value: 'Alex Example', score: 0 },
    { value: 'Alex', score: 0 },
    { value: 'AlexExample', score: 0 }
  ];

  const ranked = rankSuggestions(suggestions, 'Alex');
  assert.equal(ranked[0].value, 'Alex');
});

test('contains matches are intentionally excluded in the MVP', () => {
  const values = ['Alex Example'];
  assert.deepEqual(filterSuggestions('Example', values), []);
});

test('duplicate suggestions are removed only when casing is identical', () => {
  const values = ['Alex', ' alex ', 'Alex Example'];
  const result = filterSuggestions('Alex', values);
  assert.deepEqual(result.map((item) => item.value), ['Alex', 'Alex Example']);
});

test('stored value deduplication treats different casing as different values', () => {
  const values = deduplicateValues(['Alex', ' alex ', 'ALEX EXAMPLE']);
  assert.deepEqual(values, ['Alex', 'alex', 'ALEX EXAMPLE']);
});
