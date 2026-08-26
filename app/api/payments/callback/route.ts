import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { appBaseUrl } from "@/lib/appUrl";
import { settlePayment } from "@/lib/settlePayment";

/**
 * Retour du client depuis la page de paiement Notch Pay.
 *
 * Cette route ne sert pas seulement à ramener le client : elle dénoue le
 * paiement elle aussi. Le webhook reste la voie normale, mais il peut tarder ou
 * se perdre — un client qui revient et voit encore « crédits épuisés » n'a pas
 * à comprendre pourquoi. settlePayment() étant rejouable, faire les deux ne
 * risque rien.
 *
 * Le client est ensuite renvoyé vers la page tarifs, qui affiche l'issue.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";
  // Notch Pay renvoie `reference` (la sienne) et `trxref` (la nôtre) ;
  // settlePayment() reconnaît les deux.
  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    searchParams.get("merchant_reference");

  const issue = reference
    ? await settlePayment(getSupabaseAdmin(), reference)
    : "unknown";

  return NextResponse.redirect(`${appBaseUrl()}/${locale}/pricing?paiement=${issue}`);
}
