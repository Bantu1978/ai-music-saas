import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

// Source unique de vérité pour les locales : src/i18n/routing.ts
export default createMiddleware(routing);

export const config = {
  matcher: [
    /*
     * Ignorer les routes API, les fichiers statiques, les images
     * et la route de callback OAuth.
     * Sans l'exclusion de `api`, next-intl réécrit /api/* en /fr/api/*
     * et toutes les routes API répondent 404.
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
