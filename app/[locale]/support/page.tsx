import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import ClaimForm from "@/components/ClaimForm";

/**
 * Page de réclamations.
 *
 * Accessible sans compte : un client bloqué au paiement ou à la connexion est
 * précisément celui qui ne peut pas s'authentifier pour se plaindre. Quand une
 * session existe, son adresse est reprise et le champ disparaît.
 */
export default async function SupportPage() {
  const t = await getTranslations("Claims");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl w-full mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold">{t("title")}</h1>
        <p className="text-zinc-400 mt-2 leading-relaxed">{t("subtitle")}</p>
      </div>

      {/* Ce que le client peut attendre, dit avant qu'il n'écrive : sans SMTP
          configuré, aucune réponse automatique ne part, et le laisser guetter
          un email qui n'arrivera pas serait le tromper. */}
      <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300 leading-relaxed">
        {t("expectations")}
      </div>

      <ClaimForm emailConnecte={user?.email ?? null} />
    </div>
  );
}
