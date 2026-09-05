import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Thin JSON layer over AsyncStorage. Backed by localStorage on web, so the
 * whole app works in the browser preview with no changes.
 *
 * Reads never throw: corrupt or missing data falls back to the supplied default
 * rather than wedging the app on launch, which matters because there is no
 * server to re-fetch from.
 */

const NS = 'mettle:v1:';

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(NS + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(NS + key, JSON.stringify(value));
}

export async function appendJson<T>(key: string, value: T): Promise<void> {
  const existing = await readJson<T[]>(key, []);
  existing.push(value);
  await writeJson(key, existing);
}

export async function clearAll(keys: readonly string[]): Promise<void> {
  await AsyncStorage.multiRemove(keys.map((k) => NS + k));
}
