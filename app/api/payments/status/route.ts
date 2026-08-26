import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";

/**
 * État d'un paiement, pour la page qui attend sa confirmation.
 *
 * Depuis que seul le webhook crédite, un client qui revient de Notch Pay voit
 * « en attente » et n'a aucun moyen de savoir quand ses crédits arrivent, sinon
 * recharger la page au hasard. Cette route lui permet de patienter en étant
 * tenu au courant.
 *
 * Deux restrictions la rendent inoffensive :
 *   - il faut être connecté ;
 *   - le paiement doit appartenir à l'appelant. Sans cette condition, une
 *     référence devinée renseignerait sur les achats d'un tiers.
 *
 * Elle ne crédite rien et n'interroge pas Notch Pay : elle lit notre journal.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference) {
    return NextResponse.json({ error: "reference requise." }, { status: 400 });
  }

  const { data: row } = await getSupabaseAdmin()
    .from("payments")
    .select("status")
    .eq("reference", reference)
    .eq("user_id", user.id)
    .maybeSingle<{ status: string }>();

  // Référence inconnue ou appartenant à quelqu'un d'autre : même réponse, pour
  // ne rien révéler de l'existence du paiement.
  return NextResponse.json({ status: row?.status ?? "unknown" });
}
