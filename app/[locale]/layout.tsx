import "../globals.css";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/src/i18n/routing";
import SiteHeader from "@/components/SiteHeader";
import RefreshOnFocus from "@/components/RefreshOnFocus";

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
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col">
        <NextIntlClientProvider>
          <RefreshOnFocus />
          <SiteHeader />
          <main className="flex-1 flex flex-col">{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
