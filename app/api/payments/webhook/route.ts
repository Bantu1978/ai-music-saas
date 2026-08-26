import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { hasWebhookSecret, verifyWebhookSignature } from "@/lib/notchpay";
import { settlePayment } from "@/lib/settlePayment";

/**
 * Webhook Notch Pay.
 *
 * La signature est vérifiée **si** un secret est configuré. Notch Pay n'en
 * délivre pas : leur API de création de webhook ne renvoie aucun secret, et la
 * documentation n'en montre qu'un espace réservé. Exiger une signature
 * inexistante rendrait simplement la route inutilisable.
 *
 * Ce n'est pas un renoncement, parce que la sécurité de l'attribution ne repose
 * pas sur la signature. Ce webhook ne transporte qu'une chose digne d'intérêt :
 * une référence. Le statut et le montant sont relus chez Notch Pay par
 * settlePayment(), et les crédits ne sont accordés que si l'API confirme
 * elle-même l'encaissement.
 *
 * Ce qu'un tiers pourrait donc obtenir en forgeant un appel :
 *   - référence inconnue      -> rien, settlePayment s'arrête avant tout appel externe ;
 *   - référence en attente    -> une interrogation de Notch Pay, qui répondra « en attente » ;
 *   - référence déjà réglée   -> rien, le verrou de statut a déjà joué.
 *
 * Dans aucun cas un crédit n'est accordé sans paiement réel. Si Notch Pay
 * introduit un jour un secret, le renseigner dans NOTCHPAY_WEBHOOK_SECRET
 * réactive la vérification stricte sans autre changement.
 *
 * Deux réponses seulement : 400 si une signature attendue ne vaut rien, 200
 * sinon. Un 500 provoquerait des relances en boucle pour un paiement déjà réglé.
 */
export async function POST(req: NextRequest) {
  // Corps brut : re-sérialiser le JSON déplacerait un espace et invaliderait
  // le HMAC.
  const raw = await req.text();

  if (hasWebhookSecret()) {
    const signature =
      req.headers.get("x-notch-signature") || req.headers.get("X-Notch-Signature");

    if (!verifyWebhookSignature(raw, signature)) {
      console.warn("[webhook] signature refusée");
      return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
    }
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, note: "corps illisible" });
  }

  // La référence peut être à la racine ou sous `data` selon l'événement.
  const data = (payload?.data ?? {}) as Record<string, unknown>;
  const reference =
    (typeof data.reference === "string" && data.reference) ||
    (typeof payload?.reference === "string" && payload.reference) ||
    null;

  if (!reference) {
    return NextResponse.json({ ok: true, note: "aucune référence" });
  }

  const denouement = await settlePayment(getSupabaseAdmin(), reference);
  console.info(
    `[webhook] ${reference} -> ${denouement}${hasWebhookSecret() ? "" : " (non signé)"}`
  );

  return NextResponse.json({ ok: true, denouement });
}
