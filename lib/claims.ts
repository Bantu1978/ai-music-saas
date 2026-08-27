/**
 * Vocabulaire partagé des réclamations.
 *
 * Comme pour les choix musicaux, le serveur valide contre exactement la liste
 * que le client propose : une catégorie inconnue est refusée plutôt qu'écrite
 * telle quelle. Les contraintes de longueur reprennent celles de la migration
 * 0007 — les répéter ici permet de répondre une erreur lisible au lieu de
 * laisser PostgreSQL rejeter la ligne avec un message technique.
 */

export const CLAIM_CATEGORIES = [
  "paiement",
  "generation",
  "qualite",
  "compte",
  "autre",
] as const;
export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number];

export const CLAIM_STATUSES = ["ouverte", "en_cours", "resolue"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 4000;
export const REFERENCE_MAX = 200;
export const NAME_MAX = 120;
export const EMAIL_MAX = 320;

/** Nombre de dépôts tolérés depuis une même adresse en une heure. */
export const RATE_LIMIT_PER_HOUR = 5;

export function isClaimCategory(v: unknown): v is ClaimCategory {
  return typeof v === "string" && (CLAIM_CATEGORIES as readonly string[]).includes(v);
}

export function isClaimStatus(v: unknown): v is ClaimStatus {
  return typeof v === "string" && (CLAIM_STATUSES as readonly string[]).includes(v);
}

/**
 * Validation d'adresse volontairement permissive.
 *
 * Les expressions rationnelles ambitieuses rejettent des adresses valides plus
 * souvent qu'elles n'arrêtent les fausses. On vérifie la forme générale ; la
 * vraie preuve qu'une adresse existe serait d'y écrire, ce que nous ne faisons
 * pas encore faute de SMTP.
 */
export function looksLikeEmail(v: unknown): v is string {
  return (
    typeof v === "string" &&
    v.length <= EMAIL_MAX &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
  );
}

export type Claim = {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  category: ClaimCategory;
  reference: string | null;
  message: string;
  status: ClaimStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};
