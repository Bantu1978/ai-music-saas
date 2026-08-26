import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseUrl, supabasePublishableKey } from '@/lib/supabaseEnv'

export async function createClient() {
  const cookieStore = await cookies()
  // Côté serveur, les noms sans préfixe NEXT_PUBLIC_ conviennent aussi :
  // process.env y est complet à l exécution.
  const url = supabaseUrl();
  const key = supabasePublishableKey();

  return createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignoré dans les Server Components
          }
        },
      },
    }
  )
}