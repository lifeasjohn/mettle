import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * Sessions persist through AsyncStorage so a user stays signed in across
 * launches. `detectSessionInUrl` is off because this is a native app first; on
 * web it would try to parse an OAuth fragment that will never be there.
 */

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (!client) {
    if (!url || !anonKey) {
      throw new Error('Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
    }
    client = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

/**
 * Mettle asks for nothing before training, so the first session is anonymous.
 * That still produces a real auth.uid(), which is what every RLS policy keys
 * on, so the data model is identical whether or not the user ever signs in.
 * Linking an Apple or Google identity later upgrades the same row rather than
 * migrating anything.
 */
export async function ensureSession(): Promise<string | null> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;

  const { data: created, error } = await sb.auth.signInAnonymously();
  if (error) {
    console.error('anonymous sign-in failed', error.message);
    return null;
  }
  return created.user?.id ?? null;
}

export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase().auth.getUser();
  return data.user?.id ?? null;
}
