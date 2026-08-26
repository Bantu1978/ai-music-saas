/**
 * Résolution des identifiants Supabase publics, côté serveur.
 *
 * Deux valeurs sont en jeu : l'adresse du projet et la clé « publishable »
 * (anciennement « anon »). Elles ne sont pas secrètes — le navigateur doit
 * parler directement à Supabase, donc elles sont nécessairement livrées à
 * chaque visiteur. Ce qui protège les données, c'est la RLS, pas la discrétion
 * de cette clé. La clé de service, elle, est un vrai secret et n'a rien à faire
 * ici : voir lib/supabaseServer.ts.
 *
 * Plusieurs noms sont acceptés parce que la convention diffère selon l'endroit
 * où on les déclare. Les variantes sans préfixe NEXT_PUBLIC_ ne fonctionnent
 * que côté serveur : Next.js n'injecte dans le bundle du navigateur que les
 * variables préfixées. Le client (lib/supabase/client.ts) doit donc, lui,
 * référencer littéralement les noms NEXT_PUBLIC_.
 */

/** Noms acceptés pour l'adresse du projet, par ordre de priorité. */
export const URL_NAMES = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"] as const;

/** Noms acceptés pour la clé publique, par ordre de priorité. */
export const KEY_NAMES = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_ANON_KEY",
] as const;

/**
 * Repli codé en dur, hérité des débuts du projet.
 *
 * Il maintient le site debout quand aucune variable n'est déclarée, mais masque
 * précisément le genre de configuration manquante qu'on cherche à repérer. Le
 * panneau de configuration signale son usage. À supprimer une fois les
 * variables NEXT_PUBLIC_ posées partout.
 */
const REPLI_URL = "https://jehujyvzkjrflmatpsmo.supabase.co";
const REPLI_KEY = "sb_publishable_pxDEPJpGVZpidu-f1lFSww_qVP74a4A";

function premier(noms: readonly string[]): string | null {
  for (const nom of noms) {
    const valeur = (process.env[nom] || "").trim();
    if (valeur) return valeur;
  }
  return null;
}

/** Nom de la variable réellement retenue, ou null si aucune. */
export function supabaseUrlSource(): string | null {
  return URL_NAMES.find((n) => (process.env[n] || "").trim()) ?? null;
}

export function supabaseKeySource(): string | null {
  return KEY_NAMES.find((n) => (process.env[n] || "").trim()) ?? null;
}

export function supabaseUrl(): string {
  return premier(URL_NAMES) ?? REPLI_URL;
}

export function supabasePublishableKey(): string {
  return premier(KEY_NAMES) ?? REPLI_KEY;
}
