import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";

const PHONE_PATTERN = /^[1-9]\d{7,14}$/;

/**
 * Appelée avant supabase.auth.signUp() : si le numéro est déjà pris, on le
 * refuse tout de suite plutôt qu'après avoir créé (et envoyé un email de
 * confirmation à) un compte par email qui resterait orphelin, sans téléphone.
 */
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

  const { data: existingProfile, error } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("signup/check: recherche du profil impossible", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
  if (existingProfile) {
    return NextResponse.json(
      { error: "Ce numéro est déjà utilisé par un autre compte." },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true });
}
