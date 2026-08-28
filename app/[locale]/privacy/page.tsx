import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { DERNIERE_MAJ, sections } from "@/lib/privacy";
import { routing } from "@/src/i18n/routing";

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Privacy");

  // Le document n'existe qu'en français et en anglais ; toute autre langue
  // retombe sur le français, langue de rédaction et de référence.
  const contenu = sections(locale === "en" ? "en" : "fr");

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-500">{t("lastUpdated", { date: DERNIERE_MAJ })}</p>
      <p className="mt-4 text-sm text-zinc-400 leading-relaxed">{t("intro")}</p>

      <div className="mt-10 space-y-8">
        {contenu.map((s) => (
          <section key={s.titre}>
            <h2 className="text-lg font-bold text-zinc-100 mb-2">{s.titre}</h2>
            <div className="space-y-2">
              {s.paragraphes.map((p, i) => (
                <p key={i} className="text-sm text-zinc-300 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-12 pt-6 border-t border-zinc-800 text-sm text-zinc-400">
        {t("exercise")}{" "}
        <Link
          href="/support"
          className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
        >
          {t("supportLink")}
        </Link>
      </p>
    </div>
  );
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}
