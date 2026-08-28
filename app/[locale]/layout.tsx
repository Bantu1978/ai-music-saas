import "../globals.css";
import { Inter } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/src/i18n/routing";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import RefreshOnFocus from "@/components/RefreshOnFocus";

/**
 * Police de l'interface.
 *
 * Jusqu'ici aucune fonte n'était chargée : le navigateur retombait sur son
 * serif par défaut (Times New Roman), d'où l'impression de flou — les
 * empattements et les traits irréguliers rendent mal en petit corps sur fond
 * sombre.
 *
 * `next/font` télécharge la fonte au build et la sert depuis notre domaine :
 * aucun appel à Google au chargement de la page, et surtout aucun décalage de
 * mise en page, la métrique étant connue d'avance.
 *
 * Le nom de la variable est volontairement distinct de `--font-sans`, que
 * globals.css fait pointer ici. L'un se définit, l'autre le consomme : les
 * confondre créait la référence circulaire qui neutralisait tout.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      {/* `antialiased` : sur fond sombre, le rendu par défaut épaissit les
          lettres et brouille les contours. C'est le second facteur de flou,
          après l'absence de fonte. */}
      <body className="font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <RefreshOnFocus />
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
          <SiteFooter />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
