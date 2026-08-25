import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createBrowserClient(url, key);
}