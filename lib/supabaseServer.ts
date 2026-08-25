import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Client Supabase avec la clé service_role (contourne le RLS).
 * À n'utiliser que dans les Route Handlers / code serveur, jamais côté client.
 *
 * L'initialisation est paresseuse et échoue explicitement : sans les variables
 * d'environnement, les routes renvoyaient auparavant un « Utilisateur non trouvé »
 * trompeur à cause des valeurs de repli placeholder/dummy_key.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [
    !url && "SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length > 0) {
    throw new Error(
      `Configuration Supabase serveur manquante : ${missing.join(", ")}. ` +
        `Renseignez ces variables dans .env.local (voir .env.example).`
    );
  }

  cached = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
