import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { signatureVerdict, webhookStrict } from "@/lib/notchpay";
import { settlePayment } from "@/lib/settlePayment";

/**
 * Webhook Notch Pay.
 *
 * Notch Pay signe ses livraisons — l'en-tête `x-notch-signature` figure dans
 * leurs journaux — mais ne documente nulle part avec quel secret. La clé privée
 * est l'hypothèse la plus probable ; elle n'est pas confirmée.
 *
 * D'où la conduite retenue : **le verdict est rapporté, pas imposé**. La réponse
 * renvoyée porte `signature: valide | invalide | absente | non-configure`, et
 * Notch Pay l'enregistre dans son journal de livraison. Il suffit donc d'y
 * regarder pour savoir si un secret candidat est le bon — sans jamais risquer
 * de couper les paiements sur une hypothèse fausse.
 *
 * Une fois le secret confirmé, `NOTCHPAY_WEBHOOK_STRICT=1` fait rejeter les
 * signatures invalides.
 *
 * Laisser passer une signature invalide ne crédite personne à tort : ce webhook
 * ne transporte qu'une référence. Le statut et le montant sont relus chez
 * Notch Pay par settlePayment(), et les crédits ne sont accordés que si l'API
 * confirme elle-même l'encaissement. Ce qu'un tiers obtiendrait en forgeant un
 * appel :
 *   - référence inconnue      -> rien, settlePayment s'arrête avant tout appel externe ;
 *   - référence en attente    -> une interrogation de Notch Pay, qui répondra « en attente » ;
 *   - référence déjà réglée   -> rien, le verrou de statut a déjà joué.
 *
 * Deux réponses seulement : 400 si le mode strict refuse la signature, 200
 * sinon. Un 500 provoquerait des relances en boucle pour un paiement déjà réglé.
 */
export async function POST(req: NextRequest) {
  // Corps brut : re-sérialiser le JSON déplacerait un espace et invaliderait
  // le HMAC.
  const raw = await req.text();

  const signature =
    req.headers.get("x-notch-signature") || req.headers.get("X-Notch-Signature");
  const verdict = signatureVerdict(raw, signature);

  if (verdict !== "valide" && verdict !== "non-configure") {
    console.warn(`[webhook] signature ${verdict}${webhookStrict() ? " — rejetée" : " — tolérée"}`);

    if (webhookStrict()) {
      return NextResponse.json({ error: "Signature invalide.", signature: verdict }, { status: 400 });
    }
  }

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, signature: verdict, note: "corps illisible" });
  }

  // La référence peut être à la racine ou sous `data` selon l'événement, et
  // porter trois noms : `reference` est celle de Notch Pay, `trxref` et
  // `merchant_reference` sont la nôtre. settlePayment() reconnaît les deux,
  // on retient donc la première présente.
  const data = (payload?.data ?? {}) as Record<string, unknown>;
  const candidats = [
    data.reference,
    data.trxref,
    data.merchant_reference,
    payload?.reference,
    payload?.trxref,
    payload?.merchant_reference,
  ];
  const reference =
    candidats.find((c): c is string => typeof c === "string" && c.length > 0) ?? null;

  if (!reference) {
    return NextResponse.json({ ok: true, signature: verdict, note: "aucune référence" });
  }

  const denouement = await settlePayment(getSupabaseAdmin(), reference);
  console.info(`[webhook] ${reference} -> ${denouement} (signature ${verdict})`);

  return NextResponse.json({ ok: true, signature: verdict, denouement });
}
