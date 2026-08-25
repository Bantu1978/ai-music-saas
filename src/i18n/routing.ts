import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  // Toutes les URL portent leur préfixe de langue : "/" redirige vers "/fr".
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
