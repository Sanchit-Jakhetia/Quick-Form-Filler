import { StoredValue } from '../shared/types.js';

const STORAGE_KEY = 'quickFormFillerValues';
export const ENABLED_STORAGE_KEY = 'quickFormFillerEnabled';

export function normalizeStoredValue(value: string): string {
  return value.trim();
}

export async function getStoredValues(): Promise<StoredValue[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const values = result[STORAGE_KEY] ?? [];
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
}

export async function isExtensionEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(ENABLED_STORAGE_KEY);
  return result[ENABLED_STORAGE_KEY] !== false;
}

export async function setExtensionEnabled(enabled: boolean): Promise<void> {
  await chrome.storage.local.set({ [ENABLED_STORAGE_KEY]: enabled });
}

export async function toggleExtensionEnabled(): Promise<boolean> {
  const enabled = !(await isExtensionEnabled());
  await setExtensionEnabled(enabled);
  return enabled;
}

export async function setStoredValues(values: StoredValue[]): Promise<void> {
  const deduped = deduplicateValues(values);
  await chrome.storage.local.set({ [STORAGE_KEY]: deduped });
}

export async function addStoredValue(value: string): Promise<StoredValue[]> {
  const trimmed = value.trim();
  if (!trimmed) {
    return getStoredValues();
  }

  const current = await getStoredValues();
  const next = deduplicateValues([...current, trimmed]);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function importStoredValues(values: string[]): Promise<StoredValue[]> {
  const current = await getStoredValues();
  const next = deduplicateValues([...current, ...values]);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function updateStoredValue(oldValue: string, newValue: string): Promise<StoredValue[]> {
  const normalizedOld = oldValue.trim();
  const normalizedNew = newValue.trim();
  if (!normalizedOld || !normalizedNew) {
    return getStoredValues();
  }

  const current = await getStoredValues();
  const oldKey = normalizeStoredValue(normalizedOld);
  const newKey = normalizeStoredValue(normalizedNew);

  if (oldKey !== newKey && current.some((item) => normalizeStoredValue(item) === newKey)) {
    return current;
  }

  const updated = current.map((item) => (item === normalizedOld ? normalizedNew : item));
  const next = deduplicateValues(updated);
  await chrome.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

export async function deleteStoredValue(value: string): Promise<StoredValue[]> {
  const current = await getStoredValues();
  const next = current.filter((item) => item !== value);
  await chrome.storage.local.set({ [STORAGE_KEY]: next});
  return next;
}

export function deduplicateValues(values: StoredValue[]): StoredValue[] {
  const seen = new Set<string>();
  const unique: StoredValue[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    const key = normalizeStoredValue(trimmed);
    if (!trimmed || seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(trimmed);
  }

  return unique;
}
