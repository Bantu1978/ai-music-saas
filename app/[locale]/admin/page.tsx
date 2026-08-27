import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import AdminConsole from "@/components/AdminConsole";
import AdminClaims from "@/components/AdminClaims";

// Garde côté serveur : la page n'est jamais rendue pour un non-administrateur,
// et les données ne transitent plus par le client anonyme.
export default async function AdminPage() {
  const t = await getTranslations("Admin");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-extrabold mb-2">{t("title")}</h1>
        <p className="text-red-400 font-semibold">{t("forbidden")}</p>
      </div>
    );
  }

  // Les réclamations ont leur propre route et leur propre pagination : les
  // greffer sur l'état déjà chargé de la console l'aurait alourdi sans gain.
  return (
    <>
      <AdminConsole />
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 pb-10">
        <AdminClaims />
      </div>
    </>
  );
}
