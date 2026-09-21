import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

// E.164 sans le « + » : indicatif pays suivi du numéro, 8 à 15 chiffres au
// total. Format canonique unique dans toute l'app.
const PHONE_PATTERN = /^[1-9]\d{7,14}$/;

/**
 * Deuxième moitié de l'inscription : attache le numéro de téléphone à un
 * compte déjà créé côté client via supabase.auth.signUp({ email, password }).
 *
 * L'email et le mot de passe ne transitent jamais par le serveur — c'est
 * volontaire, signUp() les envoie directement à Supabase et déclenche son
 * e-mail de confirmation intégré, le seul canal de vérification fiable après
 * l'échec de SMS (Orange, eSMS Africa) et l'attente de validation WhatsApp
 * (Meta). Le compte ne devient pleinement utilisable qu'une fois ce lien
 * cliqué : voir la vérification email_confirmed_at dans AuthModal.handleLogin.
 */
export async function POST(request: Request) {
  let body: { userId?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";

  if (!userId || !PHONE_PATTERN.test(phone)) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (profileError) {
    console.error("signup: recherche du profil impossible", profileError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (existingProfile) {
    return NextResponse.json(
      { error: "Ce numéro est déjà utilisé par un autre compte." },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    phone,
    phone_confirm: true,
  });

  if (updateError) {
    console.error("signup: attachement du numéro impossible", updateError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  // Le déclencheur handle_new_user() ne rejoue qu'à l'INSERT initial (fait à
  // l'inscription par email, sans le téléphone) : il ne réagit pas à cette
  // mise à jour. profiles.phone doit donc être synchronisé explicitement.
  const { error: syncError } = await admin.from("profiles").update({ phone }).eq("id", userId);

  if (syncError) {
    console.error("signup: synchronisation du profil impossible", syncError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
