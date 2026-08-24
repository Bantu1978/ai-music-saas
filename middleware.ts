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
  // Ignorer les fichiers statiques, les routes API et les dossiers internes de Next.js
  matcher: ['/', '/(fr|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};