import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const PHONE_PATTERN = /^[1-9]\d{7,14}$/;
const LOCALES = ["fr", "en"];

/** j***@gmail.com : assez pour reconnaître sa boîte, pas assez pour la révéler. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}***@${domain}`;
}

/**
 * Mot de passe oublié : le compte se retrouve par son numéro (l'identifiant
 * de connexion), le lien de réinitialisation part vers l'email du profil.
 *
 * Envoi via le client SSR (et non un client supabase-js nu) : il fait du
 * PKCE et pose le code_verifier en cookie, ce que /auth/callback attend pour
 * échanger le code du lien contre une session avant /auth/update-password.
 */
export async function POST(request: Request) {
  let body: { phone?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const locale = typeof body.locale === "string" && LOCALES.includes(body.locale) ? body.locale : "fr";

  if (!PHONE_PATTERN.test(phone)) {
    return NextResponse.json({ error: "Numéro invalide." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await getSupabaseAdmin()
    .from("profiles")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();

  if (profileError) {
    console.error("password-reset: recherche du profil impossible", profileError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!profile) {
    return NextResponse.json({ error: "Ce numéro n'est associé à aucun compte." }, { status: 404 });
  }
  if (!profile.email) {
    return NextResponse.json(
      { error: "Aucun email n'est associé à ce compte. Contactez l'assistance." },
      { status: 422 }
    );
  }

  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const { error: sendError } = await supabase.auth.resetPasswordForEmail(profile.email, {
    redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(`/${locale}/auth/update-password`)}`,
  });

  if (sendError) {
    console.error("password-reset: envoi de l'email impossible", sendError);
    if (sendError.code === "over_email_send_rate_limit") {
      return NextResponse.json(
        { error: "Trop de demandes pour le moment. Réessayez dans quelques minutes." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Échec de l'envoi de l'email. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, email: maskEmail(profile.email) });
}
