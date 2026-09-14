import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { checkVerification } from "@/lib/esmsVerify";

// Même format canonique sans « + » que signup/send.
const PHONE_PATTERN = /^[1-9]\d{7,14}$/;
const MIN_PASSWORD_LENGTH = 8;

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Code incorrect.",
  failed: "Trop de tentatives, redemandez un code.",
  expired: "Code expiré, redemandez-en un.",
  canceled: "Vérification annulée, redemandez un code.",
};

/**
 * Crée le compte une fois le numéro vérifié. Contrairement à l'ancien flux,
 * le mot de passe est choisi par l'utilisateur et lui reste connu : c'est le
 * client qui se connecte ensuite lui-même (signInWithPassword), pas cette
 * route — elle ne fait que créer le compte côté serveur (admin requis).
 */
export async function POST(request: Request) {
  let body: { phone?: unknown; code?: unknown; password?: unknown; fullName?: unknown; verificationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const verificationId = typeof body.verificationId === "string" ? body.verificationId : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() || null : null;

  if (
    !PHONE_PATTERN.test(phone) ||
    !verificationId ||
    code.length < 4 ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const verifyResult = await checkVerification(verificationId, code);

  if (!verifyResult.ok) {
    console.error("signup/verify: eSMS Verify check échoué", verifyResult);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  if (verifyResult.status !== "approved") {
    return NextResponse.json(
      { error: STATUS_MESSAGES[verifyResult.status] ?? "Code invalide." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Filet contre une double inscription lancée en parallèle sur le même
  // numéro pendant la fenêtre de vérification.
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json(
      { error: "Ce numéro est déjà inscrit. Connectez-vous plutôt." },
      { status: 409 }
    );
  }

  const { error: createError } = await admin.auth.admin.createUser({
    phone,
    password,
    phone_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (createError) {
    console.error("signup/verify: création du compte impossible", createError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
