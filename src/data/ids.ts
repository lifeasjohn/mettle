/**
 * Sortable-ish local ids. Not cryptographic and not required to be: rows are
 * per-user and the Supabase adapter lets Postgres generate its own.
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${time}${rand}`;
}
