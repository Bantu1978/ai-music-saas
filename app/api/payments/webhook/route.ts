import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { verifyWebhookSignature } from "@/lib/notchpay";
import { settlePayment } from "@/lib/settlePayment";

/**
 * Webhook Notch Pay.
 *
 * Le corps n'est cru sur rien d'autre que la référence : le statut et le
 * montant sont relus chez Notch Pay par settlePayment(). C'est ce qui rend la
 * route insensible à la forme exacte de la charge utile — laquelle varie selon
 * les versions de l'API — et à un rejeu.
 *
 * Deux réponses seulement : 400 si la signature ne vaut rien, 200 sinon. Un 500
 * sur un traitement provoquerait des relances en boucle chez Notch Pay pour un
 * paiement déjà réglé.
 */
export async function POST(req: NextRequest) {
  // Corps brut : re-sérialiser le JSON déplacerait un espace et invaliderait
  // le HMAC.
  const raw = await req.text();
  const signature =
    req.headers.get("x-notch-signature") || req.headers.get("X-Notch-Signature");

  if (!verifyWebhookSignature(raw, signature)) {
    console.warn("[webhook] signature refusée");
    return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
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
  console.info(`[webhook] ${reference} -> ${denouement}`);

  return NextResponse.json({ ok: true, denouement });
}
