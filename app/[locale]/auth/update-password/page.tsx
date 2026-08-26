import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import UpdatePasswordForm from "@/components/UpdatePasswordForm";

/**
 * Destination du lien « mot de passe oublié ».
 *
 * Le lien de l'email pointe sur /auth/callback, qui échange le code contre une
 * session avant de rediriger ici : à ce stade l'utilisateur est authentifié, et
 * `updateUser({ password })` suffit. Sans session, le lien a expiré ou a déjà
 * servi — on ne montre pas le formulaire.
 */
export default async function UpdatePasswordPage() {
  const t = await getTranslations("ResetPassword");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-extrabold mb-2">{t("invalidTitle")}</h1>
        <p className="text-zinc-400 text-sm mb-8">{t("invalidBody")}</p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition"
        >
          {t("backHome")}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-extrabold mb-2">{t("title")}</h1>
        <p className="text-zinc-400 text-sm">{t("subtitle")}</p>
      </div>
      <UpdatePasswordForm />
    </div>
  );
}
