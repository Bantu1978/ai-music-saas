import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { ensureProfile } from "@/lib/profile";
import { isAdmin } from "@/lib/admin";
import StudioForm from "@/components/StudioForm";
import SignInPrompt from "@/components/SignInPrompt";

/**
 * Garde d'accès au studio.
 *
 * Elle ne porte plus que sur la connexion. Le solde était autrefois contrôlé
 * ici aussi, et remplaçait le formulaire par un panneau « Crédits épuisés » —
 * ce qui coûtait aux clients leur génération en cours.
 *
 * L'enchaînement : générer débite le crédit, donc le solde tombe souvent à
 * zéro pendant l'attente. Il suffisait alors de quitter l'onglet et d'y revenir
 * pour que RefreshOnFocus rejoue ce composant, qui rendait le panneau au lieu
 * du formulaire. StudioForm était démonté, sa boucle d'attente mourait avec
 * lui, et le morceau était perdu — le crédit, lui, était bien dépensé.
 *
 * StudioForm porte déjà son propre panneau de solde vide, et le masque pendant
 * une génération. Le contrôle n'a donc rien perdu, sinon sa capacité à
 * interrompre le travail en cours. `/api/generate` reste l'autorité réelle :
 * il revérifie connexion et solde à chaque appel.
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

  return <StudioForm initialCredits={credits} unlimited={unlimited} />;
}
