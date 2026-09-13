import { NextResponse } from "next/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabaseEnv";
import { checkVerification } from "@/lib/esmsVerify";
import { generateOneTimePassword } from "@/lib/otp";

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Code incorrect.",
  failed: "Trop de tentatives, redemandez un code.",
  expired: "Code expiré, redemandez-en un.",
  canceled: "Vérification annulée, redemandez un code.",
};

export async function POST(request: Request) {
  let body: { phone?: unknown; code?: unknown; fullName?: unknown; verificationId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  const verificationId = typeof body.verificationId === "string" ? body.verificationId : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() || null : null;

  if (!PHONE_PATTERN.test(phone) || !verificationId || code.length < 4) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const verifyResult = await checkVerification(verificationId, code);

  if (!verifyResult.ok) {
    console.error("otp/verify: eSMS Verify check échoué", verifyResult);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  if (verifyResult.status !== "approved") {
    return NextResponse.json(
      { error: STATUS_MESSAGES[verifyResult.status] ?? "Code invalide." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();

  // Mot de passe à usage unique, connu du seul serveur : il ne sert qu'à
  // échanger ce numéro vérifié contre une vraie session Supabase juste après.
  const oneTimePassword = generateOneTimePassword();

  // auth.users (et donc profiles.phone, rempli par le déclencheur) stocke le
  // numéro sans le préfixe « + » — Supabase le normalise ainsi en interne,
  // même si signInWithPassword et admin.createUser acceptent les deux formes.
  const normalizedPhone = phone.replace(/^\+/, "");

  const { data: existingProfile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (profileError) {
    console.error("otp/verify: recherche du profil impossible", profileError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  if (existingProfile) {
    const { error: updateError } = await admin.auth.admin.updateUserById(existingProfile.id, {
      password: oneTimePassword,
    });
    if (updateError) {
      console.error("otp/verify: rotation du mot de passe impossible", updateError);
      return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
  } else {
    const { error: createError } = await admin.auth.admin.createUser({
      phone,
      password: oneTimePassword,
      phone_confirm: true,
      user_metadata: fullName ? { full_name: fullName } : undefined,
    });
    if (createError) {
      console.error("otp/verify: création du compte impossible", createError);
      return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
    }
  }

  // Client anonyme dédié : signInWithPassword doit passer par la clé
  // publique, pas par le client service_role qui n'a pas de notion de session.
  const anon = createSupabaseJsClient(supabaseUrl(), supabasePublishableKey());
  const { data: session, error: signInError } = await anon.auth.signInWithPassword({
    phone,
    password: oneTimePassword,
  });

  if (signInError || !session.session) {
    console.error("otp/verify: connexion impossible", signInError);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }

  // Pose les cookies de session sur la réponse de cette route via le client
  // SSR — le navigateur les récupère comme pour n'importe quelle requête
  // same-origin, sans étape supplémentaire côté client.
  const supabase = await createServerClient();
  await supabase.auth.setSession({
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  });

  // Les tokens repartent aussi dans le corps de la réponse : le client doit
  // les rejouer dans SON propre client Supabase (setSession), sinon son SDK
  // ignore la nouvelle session tant que la page n'est pas rechargée en dur —
  // les cookies posés ci-dessus ne suffisent qu'aux rendus serveur suivants.
  return NextResponse.json({
    ok: true,
    session: {
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    },
  });
}
