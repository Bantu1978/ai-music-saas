import type { SupabaseClient } from "@supabase/supabase-js";
import { adjustCredits } from "@/lib/credits";
import { retrievePayment, PAID_STATUSES, DEAD_STATUSES } from "@/lib/notchpay";

/**
 * Dénouement d'un paiement : c'est ici, et nulle part ailleurs, que des crédits
 * sont accordés contre de l'argent.
 *
 * Appelée par deux chemins qui peuvent se croiser — le webhook de Notch Pay et
 * le retour du client dans son navigateur. L'un peut arriver avant l'autre,
 * les deux peuvent arriver deux fois. La fonction est donc rejouable sans
 * conséquence : le passage `pending -> complete` sert de verrou, et le nombre
 * de lignes modifiées décide si l'on crédite ou non.
 *
 * Le statut et le montant ne viennent jamais de l'appelant : ils sont relus
 * chez Notch Pay. Un webhook falsifié ou rejoué ne peut donc rien déclencher
 * que l'API elle-même ne confirme.
 */

export type Denouement =
  | "credited"    // crédits accordés à l'instant
  | "already"     // déjà réglé, rien à faire
  | "pending"     // Notch Pay n'a pas encore conclu
  | "failed"      // paiement perdu, marqué comme tel
  | "unknown"     // référence inconnue de notre journal
  | "unverified"; // Notch Pay injoignable : on ne conclut pas

type PaymentRow = {
  reference: string;
  provider_reference: string | null;
  user_id: string;
  credits: number;
  amount: number;
  status: string;
};

/**
 * Une référence exploitable ne contient que des caractères inoffensifs.
 *
 * Elle arrive d'un webhook, donc d'une source non maîtrisée, et sert à
 * construire un filtre `or(...)` PostgREST où la virgule et les parenthèses ont
 * un sens. Tout ce qui sort de ce jeu est écarté avant d'atteindre la requête.
 */
const REFERENCE_VALIDE = /^[A-Za-z0-9._-]{1,128}$/;

export async function settlePayment(
  admin: SupabaseClient,
  reference: string
): Promise<Denouement> {
  if (!REFERENCE_VALIDE.test(reference)) return "unknown";

  // L'identifiant reçu peut être le nôtre (trxref / merchant_reference) comme
  // celui de Notch Pay (reference) : les deux chemins de retour ne rapportent
  // pas le même.
  const { data: row } = await admin
    .from("payments")
    .select("reference, provider_reference, user_id, credits, amount, status")
    .or(`reference.eq.${reference},provider_reference.eq.${reference}`)
    .maybeSingle<PaymentRow>();

  if (!row) return "unknown";
  if (row.status === "complete") return "already";

  // La relecture ne fonctionne qu'avec la référence de Notch Pay. La nôtre sert
  // de repli pour les lignes antérieures à l'enregistrement de la sienne.
  const distant = await retrievePayment(row.provider_reference || row.reference);
  if (!distant?.status) return "unverified";

  const statut = String(distant.status).toLowerCase();

  if (DEAD_STATUSES.includes(statut)) {
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("reference", row.reference)
      .eq("status", "pending");
    return "failed";
  }

  if (!PAID_STATUSES.includes(statut)) return "pending";

  // Le montant encaissé doit couvrir le prix catalogue enregistré à l'ouverture.
  // Sans ce contrôle, un paiement partiel débloquerait un pack entier.
  const encaisse = Number(distant.amount);
  if (!Number.isFinite(encaisse) || encaisse < row.amount) {
    console.error(
      `[settle] montant insuffisant sur ${row.reference} : ${distant.amount} reçu pour ${row.amount} attendu`
    );
    return "pending";
  }

  // Verrou : seule la requête qui fait effectivement basculer la ligne crédite.
  const { data: verrou, error } = await admin
    .from("payments")
    .update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("reference", row.reference)
    .eq("status", "pending")
    .select("reference");

  if (error) {
    console.error("[settle] bascule refusée :", error.message);
    return "unverified";
  }
  if (!verrou || verrou.length === 0) return "already";

  const credit = await adjustCredits(admin, row.user_id, row.credits);
  if (!credit.ok) {
    // La ligne est déjà marquée réglée : ne pas la rouvrir, sous peine de
    // créditer deux fois au prochain passage. Le journal garde la trace, et
    // l'ajustement reste faisable depuis la console d'administration.
    console.error(
      `[settle] ${row.reference} encaissé mais crédits non attribués (${credit.reason}) — à régulariser à la main`
    );
    return "credited";
  }

  await admin.from("credit_transactions").insert({
    user_id: row.user_id,
    amount: row.credits,
    description: `Achat de ${row.credits} crédits (${row.reference})`,
  });

  return "credited";
}

/**
 * Lecture seule de l'état d'un paiement, pour informer le client à son retour.
 *
 * Ne crédite rien, et n'interroge même pas Notch Pay : elle ne fait que
 * rapporter ce que notre journal sait déjà. C'est le pendant de la règle
 * « seul le webhook crédite » — voir le commentaire de la route de retour.
 */
export async function readPaymentOutcome(
  admin: SupabaseClient,
  reference: string
): Promise<Denouement> {
  if (!REFERENCE_VALIDE.test(reference)) return "unknown";

  const { data: row } = await admin
    .from("payments")
    .select("status")
    .or(`reference.eq.${reference},provider_reference.eq.${reference}`)
    .maybeSingle<{ status: string }>();

  if (!row) return "unknown";
  if (row.status === "complete") return "credited";
  if (row.status === "failed") return "failed";
  return "pending";
}
