"use client";

import { usePathname, useRouter } from "next/navigation";

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const switchLanguage = (newLocale: string) => {
    if (!pathname) return;
    const segments = pathname.split("/");
    
    // Remplacement ou ajout du préfixe de langue dans l'URL
    if (segments[1] === "fr" || segments[1] === "en") {
      segments[1] = newLocale;
    } else {
      segments.splice(1, 0, newLocale);
    }
    
    router.push(segments.join("/") || "/");
  };

  const currentLocale = pathname.startsWith("/en") ? "en" : "fr";

  return (
    <div className="flex gap-2 bg-slate-800 p-1 rounded-lg text-xs font-semibold w-fit">
      <button
        onClick={() => switchLanguage("fr")}
        className={`px-3 py-1 rounded transition ${
          currentLocale === "fr"
            ? "bg-indigo-600 text-white"
            : "hover:bg-slate-700 text-slate-300"
        }`}
      >
        FR 🇫🇷
      </button>
      <button
        onClick={() => switchLanguage("en")}
        className={`px-3 py-1 rounded transition ${
          currentLocale === "en"
            ? "bg-indigo-600 text-white"
            : "hover:bg-slate-700 text-slate-300"
        }`}
      >
        EN 🇬🇧
      </button>
    </div>
  );
}