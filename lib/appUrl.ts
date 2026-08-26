/**
 * Base publique de l'application.
 *
 * Lue sous deux noms : APP_URL (nom retenu côté Vercel, et le bon puisque cette
 * valeur ne sert que côté serveur) et NEXT_PUBLIC_APP_URL (nom historique,
 * conservé pour .env.local). Le repli sur localhost garantit une URL absolue,
 * exigée aussi bien par Suno que par Notch Pay.
 */
export function appBaseUrl(): string {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
