/**
 * Packs de crédits mis en vente.
 *
 * Source unique, partagée entre la page tarifs et /api/checkout : le montant
 * facturé est toujours lu ici, jamais dans le corps de la requête. Un client
 * qui poste `{ packId: "pro", amount: 1 }` n'obtient rien d'autre que le prix
 * catalogue.
 *
 * `priceXaf` est le prix de référence en francs CFA. Les conversions affichées
 * sur la page tarifs sont indicatives : Notch Pay encaisse en XAF.
 */
export const PACKS = [
  { id: "discovery", credits: 3, priceXaf: 2990, labelKey: "packDiscovery", popular: false },
  { id: "creator", credits: 10, priceXaf: 8900, labelKey: "packCreator", popular: true },
  { id: "pro", credits: 25, priceXaf: 19900, labelKey: "packPro", popular: false },
] as const;

export type Pack = (typeof PACKS)[number];
export type PackId = Pack["id"];

/** Devise réellement encaissée, quelle que soit celle affichée. */
export const CHARGE_CURRENCY = "XAF";

export function findPack(id: unknown): Pack | null {
  if (typeof id !== "string") return null;
  return PACKS.find((p) => p.id === id) ?? null;
}
