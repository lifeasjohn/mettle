import { createLocalRepository } from './local';
import type { Repository } from './types';

export * from './ids';
export * from './types';

/**
 * Adapter selection.
 *
 * Supabase is used when it is configured and the local adapter otherwise, which
 * means the app is fully functional before a Supabase project exists. There is
 * no partial mode: whichever adapter is chosen satisfies the whole interface.
 */
export const supabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);

let instance: Repository | null = null;

export function getRepository(): Repository {
  if (instance) return instance;
  // The Supabase adapter is required lazily so its client is never constructed
  // (or bundled into the first chunk) when the app is running locally.
  if (supabaseConfigured) {
    const { createSupabaseRepository } = require('./supabase') as typeof import('./supabase');
    instance = createSupabaseRepository();
  } else {
    instance = createLocalRepository();
  }
  return instance;
}

/** Test seam. Passing null forces the next getRepository() to rebuild. */
export function setRepository(repo: Repository | null): void {
  instance = repo;
}
