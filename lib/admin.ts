import type { User } from "@supabase/supabase-js";

/**
 * Liste blanche d'administrateurs, alimentée par ADMIN_EMAILS
 * (emails séparés par des virgules).
 *
 * Volontairement basée sur une variable d'environnement plutôt que sur une
 * colonne `role` : aucun changement de schéma requis, et la liste ne peut pas
 * être modifiée depuis l'application elle-même.
 */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: User | null | undefined): boolean {
  const email = user?.email?.toLowerCase();
  if (!email) return false;

  const allowed = adminEmails();
  // Liste vide = personne n'est administrateur (fail closed).
  return allowed.length > 0 && allowed.includes(email);
}
