import "../globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "../../src/i18n/routing";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-slate-950 text-slate-100 min-h-screen">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <header className="border-b border-slate-800 p-4 flex justify-between items-center max-w-6xl mx-auto">
            <span className="font-bold text-xl text-indigo-400">BAKUMELO</span>
            <LanguageSwitcher />
          </header>
          <main>{children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}