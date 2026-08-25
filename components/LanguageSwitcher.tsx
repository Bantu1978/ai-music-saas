"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/src/i18n/navigation";
import { routing, type Locale } from "@/src/i18n/routing";

const LABELS: Record<Locale, string> = { fr: "FR", en: "EN" };

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    startTransition(() => {
      // pathname est déjà dépourvu du préfixe de langue : next-intl le recolle.
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <div className="flex border-2 border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 text-xs font-bold">
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => switchTo(l)}
          disabled={isPending}
          aria-current={l === locale ? "true" : undefined}
          className={`px-3 py-1.5 transition disabled:opacity-60 ${
            l === locale
              ? "bg-indigo-600 text-white"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
