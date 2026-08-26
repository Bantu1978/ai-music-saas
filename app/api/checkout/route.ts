import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { appBaseUrl } from "@/lib/appUrl";
import { CHARGE_CURRENCY, findPack } from "@/lib/packs";
import { initializePayment } from "@/lib/notchpay";

/**
 * Ouverture d'un paiement.
 *
 * Le corps ne porte qu'un identifiant de pack. Le montant, le nombre de crédits
 * et la devise viennent du catalogue serveur : rien de ce que poste le
 * navigateur ne peut modifier le prix.
 *
 * La ligne `payments` est écrite AVANT l'appel à Notch Pay. Dans l'autre ordre,
 * un client pourrait payer une référence dont nous n'aurions aucune trace, et
 * le webhook arriverait sans savoir quoi créditer.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Vous devez être connecté pour acheter des crédits." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const pack = findPack(body?.packId);

  if (!pack) {
    return NextResponse.json({ error: "Pack inconnu." }, { status: 400 });
  }

  const locale = body?.locale === "en" ? "en" : "fr";
  const reference = `bkm_${randomUUID()}`;
  const admin = getSupabaseAdmin();

  const { error: insertError } = await admin.from("payments").insert({
    reference,
    user_id: user.id,
    pack: pack.id,
    credits: pack.credits,
    amount: pack.priceXaf,
    currency: CHARGE_CURRENCY,
    status: "pending",
  });

  if (insertError) {
    console.error("[checkout] enregistrement impossible :", insertError.message);
    return NextResponse.json(
      { error: "Impossible d'ouvrir le paiement. Réessayez dans un instant." },
      { status: 500 }
    );
  }

  const result = await initializePayment({
    amount: pack.priceXaf,
    currency: CHARGE_CURRENCY,
    reference,
    description: `BAKUMELO — ${pack.credits} crédits de génération`,
    callback: `${appBaseUrl()}/api/payments/callback?locale=${locale}`,
    email: user.email,
  });

  if (!result.ok) {
    // Le paiement n'a jamais démarré : la ligne est close pour ne pas encombrer
    // le journal de références éternellement en attente.
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("reference", reference)
      .eq("status", "pending");

    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ authorizationUrl: result.authorizationUrl, reference });
}
