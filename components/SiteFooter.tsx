import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";

/**
 * Pied de page.
 *
 * Composant serveur : il n'a aucun état ni interaction, et n'a donc pas à
 * peser sur le paquet envoyé au navigateur — contrairement à l'en-tête, qui
 * doit suivre la session et ouvrir un menu.
 *
 * Il existe d'abord pour donner à l'assistance une porte visible depuis
 * n'importe quelle page. Un client dont le paiement échoue ou dont la
 * génération se perd la cherche en bas, par réflexe, et la barre de navigation
 * la relègue derrière un menu sur téléphone.
 *
 * Les intitulés viennent de `Nav` plutôt que d'être redéclarés : deux libellés
 * pour un même lien finissent toujours par diverger.
 */
export default async function SiteFooter() {
  const t = await getTranslations("Nav");
  const tf = await getTranslations("Footer");

  const liens = [
    { href: "/generate", libelle: t("studio") },
    { href: "/dashboard", libelle: t("dashboard") },
    { href: "/pricing", libelle: t("pricing") },
    { href: "/support", libelle: t("support") },
    // Les conditions générales vivent au pied de page et nulle part ailleurs :
    // c'est là qu'on les cherche, et les mettre dans la barre principale
    // encombrerait la navigation d'un lien qu'on consulte une fois.
    { href: "/terms", libelle: t("terms") },
    { href: "/privacy", libelle: t("privacy") },
  ];

  return (
    <footer className="w-full border-t border-zinc-800/60 mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          <div>
            <p className="font-black text-lg text-indigo-400 tracking-tight">{t("brand")}</p>
            <p className="mt-1 text-xs text-zinc-500 max-w-xs leading-relaxed">{tf("tagline")}</p>
          </div>

          <nav aria-label={tf("navLabel")}>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {liens.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-zinc-400 hover:text-white transition"
                  >
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-8 pt-6 border-t border-zinc-800/60 text-xs text-zinc-600">
          © {new Date().getFullYear()} {t("brand")} — {tf("rights")}
        </p>
      </div>
    </footer>
  );
}
