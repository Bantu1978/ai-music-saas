import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { checkVerification } from "@/lib/esmsVerify";

// Même format canonique sans « + » que password-reset/send.
const PHONE_PATTERN = /^[1-9]\d{7,14}$/;
const MIN_PASSWORD_LENGTH = 8;

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Code incorrect.",
  failed: "Trop de tentatives, redemandez un code.",
  expired: "Code expiré, redemandez-en un.",
  canceled: "Vérification annulée, redemandez un code.",
};

/**
 * Fixe le nouveau mot de passe une fois le numéro vérifié. Comme pour
 * l'inscription, c'est le client qui se connecte ensuite lui-même — cette
 * route se contente de la mise à jour côté serveur (admin requis).
 */
export async function POST(request: Request) {
  let body: { phone?: unknown; code?: unknown; newPassword?: unknown; verificationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";
  const verificationId = typeof body.verificationId === "string" ? body.verificationId : "";

  if (
    !PHONE_PATTERN.test(phone) ||
    !verificationId ||
    code.length < 4 ||
    newPassword.length < MIN_PASSWORD_LENGTH
  ) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const verifyResult = await checkVerification(verificationId, code);

  if (!verifyResult.ok) {
    console.error("password-reset/verify: eSMS Verify check échoué", verifyResult);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  if (verifyResult.status !== "approved") {
    return NextResponse.json(
      { error: STATUS_MESSAGES[verifyResult.status] ?? "Code invalide." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (profileError || !existingProfile) {
    console.error("password-reset/verify: profil introuvable", profileError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existingProfile.id, {
    password: newPassword,
  });

  if (updateError) {
    console.error("password-reset/verify: mise à jour du mot de passe impossible", updateError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
