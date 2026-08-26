import type { SupabaseClient, User } from "@supabase/supabase-js";

/** Crédit offert à l'inscription, aligné sur le message de la page d'accueil. */
export const DEFAULT_NEW_USER_CREDITS = 1;

export type ProfileRow = { credits: number; full_name: string | null };

/**
 * Renvoie le profil de l'utilisateur, en le créant s'il n'existe pas encore.
 *
 * L'inscription par email ne passe pas par le callback OAuth : sans ce filet,
 * un compte créé au mot de passe pourrait se retrouver sans ligne `profiles`
 * et buter sur « Profil utilisateur introuvable » à la première génération.
 *
 * L'insertion ignore les doublons : si le projet Supabase crée déjà le profil
 * par trigger sur `auth.users`, cette fonction n'écrase rien.
 */
export async function ensureProfile(
  admin: SupabaseClient,
  user: User
): Promise<ProfileRow | null> {
  const { data: existing } = await admin
    .from("profiles")
    .select("credits, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;

  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      full_name: fullName,
      credits: DEFAULT_NEW_USER_CREDITS,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error) {
    console.error("[profile] création impossible :", error.code, error.message);
  }

  const { data: created } = await admin
    .from("profiles")
    .select("credits, full_name")
    .eq("id", user.id)
    .maybeSingle();

  return created ?? null;
}
