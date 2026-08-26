import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./src/i18n/routing";
import { isAdmin } from "./lib/admin";
import { isMaintenanceMode, maintenancePage } from "./lib/maintenance";

// Source unique de vérité pour les locales : src/i18n/routing.ts
const intlMiddleware = createMiddleware(routing);

/**
 * Le rideau « site en construction ».
 *
 * Renvoie une réponse quand le visiteur doit être arrêté, `null` quand il peut
 * poursuivre. Les administrateurs (ADMIN_EMAILS) traversent : c'est ce qui
 * permet de tester le site réel en production pendant que les autres voient la
 * page d'attente.
 */
async function maintenanceGate(req: NextRequest): Promise<NextResponse | null> {
  if (!isMaintenanceMode()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    // Lecture seule de la session : les cookies rafraîchis ne sont pas réécrits
    // ici, le reste de l'application s'en charge une fois le rideau franchi.
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    });

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (isAdmin(user)) return null;
    } catch {
      // Supabase injoignable : on garde le rideau fermé plutôt que d'ouvrir
      // le site par accident (fail closed).
    }
  }

  // 503 plutôt que 200 : les moteurs de recherche comprennent qu'il s'agit
  // d'un état passager et n'indexent pas cette page à la place du site.
  return new NextResponse(maintenancePage(), {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": "3600",
    },
  });
}

export default async function middleware(req: NextRequest) {
  const blocked = await maintenanceGate(req);
  if (blocked) return blocked;

  // next-intl ne doit voir ni les routes API ni le callback OAuth : il les
  // réécrirait en /fr/api/* et elles répondraient 404. Elles restent tout de
  // même soumises au rideau ci-dessus, sans quoi /api/generate resterait
  // ouvert pendant la fermeture du site.
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Fichiers statiques et images exclus ; tout le reste, API comprise, passe
    // par le middleware pour que le mode construction ne laisse aucune faille.
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
