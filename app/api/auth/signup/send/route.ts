import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { startVerification } from "@/lib/esmsVerify";

// E.164 sans le « + » : indicatif pays suivi du numéro, 8 à 15 chiffres au
// total. Format canonique unique dans toute l'app — Supabase et eSMS Verify
// acceptent tous deux cette forme (vérifié directement contre leurs API).
const PHONE_PATTERN = /^[1-9]\d{7,14}$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  let body: { phone?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!PHONE_PATTERN.test(phone)) {
    return NextResponse.json({ error: "Numéro invalide." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (profileError) {
    console.error("signup/send: recherche du profil impossible", profileError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (existingProfile) {
    return NextResponse.json(
      { error: "Ce numéro est déjà inscrit. Connectez-vous plutôt." },
      { status: 409 }
    );
  }

  const result = await startVerification(phone);

  if (!result.ok) {
    console.error("signup/send: eSMS Verify start échoué", result);
    if (result.code === "too_many_requests") {
      return NextResponse.json(
        { error: "Veuillez patienter avant de redemander un code." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Échec de l'envoi du SMS. Réessayez." }, { status: 502 });
  }

  // sandbox_code n'est présent qu'avec une clé esms_test_ : ça permet de
  // tester tout le parcours sans attendre un vrai SMS.
  return NextResponse.json({
    ok: true,
    verificationId: result.verificationId,
    ...(result.sandboxCode ? { devCode: result.sandboxCode } : {}),
  });
}
