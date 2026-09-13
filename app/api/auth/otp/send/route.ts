import { NextResponse } from "next/server";
import { startVerification } from "@/lib/esmsVerify";

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

  const result = await startVerification(phone);

  if (!result.ok) {
    console.error("otp/send: eSMS Verify start échoué", result);
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
