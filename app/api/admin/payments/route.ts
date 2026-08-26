import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { settlePayment } from "@/lib/settlePayment";
import { isAdmin } from "@/lib/admin";

/**
 * Vérification manuelle d'un paiement resté en attente.
 *
 * Depuis que seul le webhook crédite, un webhook perdu laisse un client qui a
 * payé sans ses crédits, et rien ne le débloque tout seul. Cette route est le
 * filet : elle redemande l'état à Notch Pay et dénoue le paiement si celui-ci
 * confirme l'encaissement.
 *
 * C'est la même fonction que celle qu'appelle le webhook, avec les mêmes
 * garde-fous — verrou de statut, contrôle du montant, aucun crédit sur un doute.
 * La seule différence est qui la déclenche : ici un administrateur, jamais le
 * navigateur d'un client.
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
  const reference = body?.reference;

  if (typeof reference !== "string" || !reference) {
    return NextResponse.json({ error: "reference requise." }, { status: 400 });
  }

  const denouement = await settlePayment(getSupabaseAdmin(), reference);
  console.info(`[admin/payments] ${reference} -> ${denouement} (par ${user!.email})`);

  return NextResponse.json({ ok: true, denouement });
}
