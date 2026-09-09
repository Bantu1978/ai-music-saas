import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { sendOrangeSms } from "@/lib/orangeSms";
import { generateOtpCode, hashOtpCode, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from "@/lib/otp";

// E.164 : « + » suivi de 8 à 15 chiffres, indicatif pays compris.
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

  const { data: last, error: lastError } = await admin
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastError) {
    console.error("otp/send: lecture du dernier envoi impossible", lastError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  if (last && Date.now() - new Date(last.created_at).getTime() < OTP_RESEND_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Veuillez patienter avant de redemander un code." },
      { status: 429 }
    );
  }

  const code = generateOtpCode();
  const codeHash = hashOtpCode(code, phone);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error: insertError } = await admin
    .from("otp_codes")
    .insert({ phone, code_hash: codeHash, expires_at: expiresAt });

  if (insertError) {
    console.error("otp/send: insertion impossible", insertError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  const isDev = process.env.NODE_ENV !== "production";

  try {
    await sendOrangeSms(phone, `Votre code de vérification BAKUMELO est ${code}. Il expire dans 5 minutes.`);
  } catch (err) {
    console.error("otp/send: envoi Orange SMS échoué", err);
    // En développement, la sandbox Orange n'envoie jamais réellement de SMS :
    // on renvoie quand même le code (voir devCode ci-dessous) pour pouvoir
    // tester le reste du parcours sans attendre l'activation production.
    if (!isDev) {
      return NextResponse.json({ error: "Échec de l'envoi du SMS. Réessayez." }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, ...(isDev ? { devCode: code } : {}) });
}
