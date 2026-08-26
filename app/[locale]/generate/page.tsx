import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { ensureProfile } from "@/lib/profile";
import { isAdmin } from "@/lib/admin";
import StudioForm from "@/components/StudioForm";
import SignInPrompt from "@/components/SignInPrompt";

/**
 * Garde d'accès au studio.
 *
 * Le formulaire n'est rendu que pour un utilisateur connecté disposant d'au
 * moins un crédit. `/api/generate` refait ces deux contrôles — celui-ci évite
 * seulement de laisser quelqu'un composer un morceau avant de découvrir qu'il
 * ne peut pas le générer.
 */
export default async function StudioPage() {
  const t = await getTranslations("Studio");
  const tNav = await getTranslations("Nav");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-extrabold mb-2">{t("title")}</h1>
        <p className="text-zinc-400 mb-8">{t("signedOut")}</p>
        <SignInPrompt label={tNav("login")} />
      </div>
    );
  }

  // Filet pour les inscriptions par email, qui ne passent pas par le callback OAuth.
  const profile = await ensureProfile(getSupabaseAdmin(), user);
  const credits = profile?.credits ?? 0;

  // Les administrateurs ne sont jamais arrêtés par un solde vide : /api/generate
  // applique la même exemption, cette garde ne fait que lui rester cohérente.
  const unlimited = isAdmin(user);

  if (!unlimited && credits < 1) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-3xl font-extrabold mb-2">{t("title")}</h1>
        <div className="mt-8 p-6 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30">
          <p className="font-bold text-amber-300 mb-1">{t("noCreditsTitle")}</p>
          <p className="text-amber-200/80 text-sm mb-6">{t("noCreditsBody")}</p>
          <Link
            href="/pricing"
            className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition"
          >
            {t("buyCredits")}
          </Link>
        </div>
      </div>
    );
  }

  return <StudioForm initialCredits={credits} unlimited={unlimited} />;
}
