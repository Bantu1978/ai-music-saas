import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed'
});

// Exportation explicite sous forme de fonction pour Next.js 16+ / Turbopack
export default function middleware(request: NextRequest) {
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Ignorer les fichiers statiques, les images et les routes d'authentification
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};