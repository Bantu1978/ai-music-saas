import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { adjustCredits } from "@/lib/credits";
import { isAdmin } from "@/lib/admin";

const MAX_GRANT = 1000;

/**
 * Attribution de crédits par un administrateur.
 *
 * Auparavant, la page /admin écrivait directement dans `profiles` avec la clé
 * anonyme depuis le navigateur : seule une politique RLS bien réglée empêchait
 * n'importe quel visiteur de s'accorder des crédits. L'écriture passe désormais
 * par la clé service_role, derrière un contrôle d'administrateur.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  const amount = Number(body?.amount);

  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId requis." }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_GRANT) {
    return NextResponse.json(
      { error: `Montant invalide (entier non nul, max ${MAX_GRANT}).` },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const result = await adjustCredits(admin, userId, amount);

  if (!result.ok) {
    if (result.reason === "error") {
      console.error("[admin/credits] refus de la base :", result.message);
      return NextResponse.json({ error: result.message }, { status: 500 });
    }
    const status =
      result.reason === "not_found" ? 404 : result.reason === "insufficient" ? 400 : 409;
    return NextResponse.json({ error: result.reason }, { status });
  }

  await admin.from("credit_transactions").insert({
    user_id: userId,
    amount,
    description: `Ajustement administrateur par ${user!.email}`,
  });

  return NextResponse.json({ ok: true, credits: result.credits });
}
