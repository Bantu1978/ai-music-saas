import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { startVerification } from "@/lib/esmsVerify";

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export async function POST(request: Request) {
  let body: { phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!PHONE_PATTERN.test(phone)) {
    return NextResponse.json({ error: "Numéro invalide." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const normalizedPhone = phone.replace(/^\+/, "");

  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (profileError) {
    console.error("password-reset/send: recherche du profil impossible", profileError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (!existingProfile) {
    return NextResponse.json({ error: "Ce numéro n'est associé à aucun compte." }, { status: 404 });
  }

  const result = await startVerification(phone);

  if (!result.ok) {
    console.error("password-reset/send: eSMS Verify start échoué", result);
    if (result.code === "too_many_requests") {
      return NextResponse.json(
        { error: "Veuillez patienter avant de redemander un code." },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: "Échec de l'envoi du SMS. Réessayez." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    verificationId: result.verificationId,
    ...(result.sandboxCode ? { devCode: result.sandboxCode } : {}),
  });
}
