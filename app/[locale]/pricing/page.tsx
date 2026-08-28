import { paiementReelDisponible } from "@/lib/notchpay";
import PricingClient from "@/components/PricingClient";

/**
 * Page tarifs.
 *
 * Enveloppe serveur, introduite pour une seule raison : savoir si l'encaissement
 * réel est possible suppose de lire NOTCHPAY_PUBLIC_KEY, qui n'a pas de préfixe
 * public et reste donc invisible du navigateur. Seule la réponse — un booléen —
 * traverse jusqu'au composant client.
 *
 * Tant qu'elle est fausse, la page prévient le visiteur au lieu de le laisser
 * s'engager dans un paiement fictif qui expirera sans rien encaisser. Le
 * bandeau disparaît de lui-même le jour où la clé passe en `pk_live` : aucune
 * modification de code, aucun oubli possible.
 */
export default function PricingPage() {
  return <PricingClient paiementDisponible={paiementReelDisponible()} />;
}
