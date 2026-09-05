import type { Repository } from '../types';

/**
 * Supabase adapter. Implemented in Phase E.
 *
 * This module is only reached when EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_ANON_KEY are both set, so the local adapter is
 * unaffected until a project actually exists.
 */
export function createSupabaseRepository(): Repository {
  throw new Error(
    'Supabase adapter is not implemented yet. Unset EXPO_PUBLIC_SUPABASE_URL to use local storage.',
  );
}
