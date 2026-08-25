import type { SupabaseClient } from "@supabase/supabase-js";

export type CreditResult =
  | { ok: true; credits: number }
  | { ok: false; reason: "not_found" | "insufficient" | "conflict" };

/**
 * Ajuste le solde de crédits de façon atomique (compare-and-swap).
 *
 * supabase-js ne sait pas écrire `credits = credits - 1`, donc on relit le solde
 * et on applique l'écriture avec `.eq("credits", solde_lu)` : si une requête
 * concurrente est passée entre-temps, 0 ligne est modifiée et on retente.
 * Deux générations simultanées ne peuvent donc plus partager un seul crédit.
 */
export async function adjustCredits(
  admin: SupabaseClient,
  userId: string,
  delta: number,
  maxAttempts = 5
): Promise<CreditResult> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data: profile, error } = await admin
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (error || !profile) return { ok: false, reason: "not_found" };

    const current: number = profile.credits ?? 0;
    const next = current + delta;

    if (next < 0) return { ok: false, reason: "insufficient" };

    const { data: updated } = await admin
      .from("profiles")
      .update({ credits: next })
      .eq("id", userId)
      .eq("credits", current) // garde optimiste : échoue si le solde a bougé
      .select("credits");

    if (updated && updated.length > 0) {
      return { ok: true, credits: updated[0].credits };
    }
    // Conflit : une autre requête a modifié le solde, on relit et on retente.
  }

  return { ok: false, reason: "conflict" };
}
