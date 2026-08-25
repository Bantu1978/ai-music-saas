import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import AdminConsole from "@/components/AdminConsole";

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

  return <AdminConsole />;
}
