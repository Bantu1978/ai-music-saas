import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { DERNIERE_MAJ, IDENTITE_COMPLETE, sections } from "@/lib/terms";
import { routing } from "@/src/i18n/routing";

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Terms");

  // Le document n'existe qu'en français et en anglais ; toute autre langue
  // retombe sur le français, langue de rédaction et de référence.
  const langue = locale === "en" ? "en" : "fr";
  const contenu = sections(langue);

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-zinc-500">{t("lastUpdated", { date: DERNIERE_MAJ })}</p>

      {/* Un contrat dont l'identité du prestataire n'est pas renseignée n'est
          pas opposable. Le dire à l'écran évite qu'un brouillon reste en ligne
          des mois en passant pour un document abouti — le bandeau disparaît
          seul dès que IDENTITE_COMPLETE passe à true. */}
      {!IDENTITE_COMPLETE && (
        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 text-amber-200/90 text-sm leading-relaxed">
          <p className="font-bold text-amber-300 mb-1">{t("draftTitle")}</p>
          <p>{t("draftBody")}</p>
        </div>
      )}

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
        {t("questions")}{" "}
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
