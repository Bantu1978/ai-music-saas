import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { appBaseUrl } from "@/lib/appUrl";
import { readPaymentOutcome } from "@/lib/settlePayment";

/**
 * Retour du client depuis la page de paiement Notch Pay.
 *
 * Cette route ne crédite rien. C'est délibéré, et c'est la règle centrale du
 * dispositif : **seul le webhook crédite**.
 *
 * Le retour navigateur a lieu dès que le client quitte la page de paiement,
 * c'est-à-dire au moment le plus optimiste — l'ordre est donné, l'encaissement
 * n'est pas nécessairement acquis. Sur du mobile money, l'écart entre les deux
 * est réel. Le webhook `payment.complete`, lui, n'est émis qu'une fois le
 * règlement définitif.
 *
 * La route se contente donc de lire notre journal et de dire au client où en
 * est son paiement. S'il revient avant le webhook, il voit « confirmation en
 * cours » plutôt que des crédits qu'il n'a peut-être pas payés.
 *
 * Contrepartie assumée : un webhook perdu laisse le paiement en attente. C'est
 * pourquoi la console d'administration liste les paiements en attente et permet
 * de les vérifier à la main — la décision revient à l'opérateur, jamais au
 * navigateur du client.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";

  // Notch Pay renvoie `reference` (la sienne) et `trxref` (la nôtre) ;
  // les deux sont reconnues.
  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    searchParams.get("merchant_reference");

  const issue = reference
    ? await readPaymentOutcome(getSupabaseAdmin(), reference)
    : "unknown";

  return NextResponse.redirect(
    `${appBaseUrl(req.nextUrl.origin)}/${locale}/pricing?paiement=${issue}`
  );
}
