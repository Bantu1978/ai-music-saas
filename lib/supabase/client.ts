import { createBrowserClient } from '@supabase/ssr'

/**
 * Client Supabase du navigateur.
 *
 * Les deux noms sont écrits littéralement, et c'est obligatoire : Next.js
 * remplace `process.env.NEXT_PUBLIC_…` par sa valeur au moment de la
 * construction du bundle. Une lecture dynamique, ou un nom sans ce préfixe,
 * n'existe tout simplement pas dans le navigateur — d'où l'impossibilité de
 * mutualiser cette résolution avec lib/supabaseEnv.ts, qui ne vaut que côté
 * serveur.
 *
 * Ces deux valeurs ne peuvent pas être tenues secrètes : le navigateur parle
 * directement à Supabase, elles sont donc livrées à chaque visiteur, quoi qu'on
 * fasse. Ce qui protège les données est la RLS, pas la discrétion de cette clé.
 * Le vrai secret est la clé de service, qui ne quitte jamais le serveur.
 *
 * Le repli codé en dur maintient le site debout si les variables manquent, mais
 * masque la configuration absente : le panneau de configuration de la console
 * d'administration signale quand il sert.
 */
export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "https://jehujyvzkjrflmatpsmo.supabase.co";

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "sb_publishable_pxDEPJpGVZpidu-f1lFSww_qVP74a4A";

  return createBrowserClient(url, key);
}
