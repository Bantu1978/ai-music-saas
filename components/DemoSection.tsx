"use client";

import { useTranslations } from "next-intl";
import { DEMOS, TEMOIGNAGES_ILLUSTRATIFS } from "@/lib/demos";

/**
 * Démos écoutables sur la page d'accueil.
 *
 * `preload="none"` n'est pas un détail : les trois morceaux pèsent treize
 * mégaoctets, et le public visé consulte le site en data mobile facturée au
 * volume. Sans cet attribut, ouvrir la page d'accueil coûterait treize
 * mégaoctets à quelqu'un qui n'a peut-être aucune intention d'écouter. Rien
 * n'est téléchargé avant un appui sur lecture.
 *
 * Composant client, la page d'accueil en étant un : il n'a aucun état propre,
 * seulement du balisage.
 */
export default function DemoSection() {
  const t = useTranslations("Testimonials");

  return (
    <section className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-16 border-t border-zinc-800/60">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t("title")}</h2>
        <p className="mt-2 text-zinc-400 text-sm sm:text-base">{t("subtitle")}</p>
      </div>

      {/* Tant que les citations sont des exemples, elles le disent. Les
          présenter comme de vrais avis serait une publicité trompeuse — et le
          bandeau disparaît de lui-même une fois TEMOIGNAGES_ILLUSTRATIFS à
          false. */}
      {TEMOIGNAGES_ILLUSTRATIFS && (
        <p className="mb-8 mx-auto max-w-2xl text-center text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 leading-relaxed">
          {t("illustrativeNotice")}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {DEMOS.map((d) => (
          <figure
            key={d.fichier}
            className="flex flex-col bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-5 hover:border-zinc-700 transition"
          >
            <blockquote className="flex-1">
              <p className="text-sm text-zinc-200 leading-relaxed">
                <span aria-hidden="true" className="text-indigo-400 font-bold">
                  «{" "}
                </span>
                {t(d.citation)}
                <span aria-hidden="true" className="text-indigo-400 font-bold">
                  {" "}
                  »
                </span>
              </p>
            </blockquote>

            <figcaption className="mt-4 text-xs text-zinc-400">
              <span className="font-bold text-zinc-300">{d.auteur}</span> · {d.lieu}
            </figcaption>

            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-xs font-bold text-zinc-200 truncate">{d.titre}</p>
              <p className="text-[11px] text-indigo-400 font-semibold mb-2">{d.genre}</p>
              <audio
                controls
                preload="none"
                src={d.fichier}
                className="w-full h-9"
                aria-label={`${t("listen")} — ${d.titre}`}
              />
            </div>
          </figure>
        ))}
      </div>

      <p className="mt-6 text-center text-[11px] text-zinc-500">{t("ownTracks")}</p>
    </section>
  );
}
