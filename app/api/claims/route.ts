import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import {
  MESSAGE_MAX,
  MESSAGE_MIN,
  NAME_MAX,
  RATE_LIMIT_PER_HOUR,
  REFERENCE_MAX,
  isClaimCategory,
  looksLikeEmail,
} from "@/lib/claims";

/**
 * Dépôt d'une réclamation.
 *
 * Route délibérément ouverte aux visiteurs : un client bloqué au paiement ou à
 * la connexion est justement celui qui ne peut pas s'authentifier pour se
 * plaindre. Exiger une session ici fermerait la porte à ceux qui en ont le
 * plus besoin.
 *
 * Cette ouverture impose trois garde-fous, absents des routes authentifiées :
 *
 *   1. un champ leurre (`website`), invisible pour un humain et rempli par les
 *      robots de formulaire. Rempli, on répond succès sans rien écrire : un
 *      refus explicite renseignerait l'auteur sur le piège ;
 *   2. un plafond par adresse et par heure, lu en base — la mémoire du
 *      processus ne survit pas à une fonction serverless ;
 *   3. des longueurs bornées avant l'insertion, pour répondre une erreur
 *      lisible plutôt que laisser PostgreSQL rejeter la ligne.
 *
 * Si une session existe, l'identité en est tirée plutôt que du corps de la
 * requête : un visiteur ne peut pas déposer une réclamation au nom d'autrui.
 */
export async function POST(req: NextRequest) {
  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête illisible." }, { status: 400 });
  }

  // Champ leurre : voir le commentaire d'en-tête.
  if (typeof corps.website === "string" && corps.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // L'email d'une session fait foi ; celui du corps n'est lu que pour un
  // visiteur, qui n'a rien d'autre à offrir.
  const email = (user?.email ?? (typeof corps.email === "string" ? corps.email : "")).trim();
  if (!looksLikeEmail(email)) {
    return NextResponse.json({ error: "Adresse email invalide." }, { status: 400 });
  }

  const category = corps.category;
  if (!isClaimCategory(category)) {
    return NextResponse.json({ error: "Catégorie inconnue." }, { status: 400 });
  }

  const message = typeof corps.message === "string" ? corps.message.trim() : "";
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return NextResponse.json(
      { error: `Le message doit faire entre ${MESSAGE_MIN} et ${MESSAGE_MAX} caractères.` },
      { status: 400 }
    );
  }

  const nom = typeof corps.name === "string" ? corps.name.trim().slice(0, NAME_MAX) : "";
  const reference =
    typeof corps.reference === "string" ? corps.reference.trim().slice(0, REFERENCE_MAX) : "";

  const admin = getSupabaseAdmin();

  const uneHeure = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await admin
    .from("claims")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", uneHeure);

  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return NextResponse.json(
      { error: "Trop de réclamations déposées récemment. Merci de réessayer dans une heure." },
      { status: 429 }
    );
  }

  const { data, error } = await admin
    .from("claims")
    .insert({
      user_id: user?.id ?? null,
      email,
      name: nom || null,
      category,
      reference: reference || null,
      message,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    console.error("[claims] insertion refusée", error.message);
    return NextResponse.json({ error: "Enregistrement impossible." }, { status: 500 });
  }

  // Les huit premiers caractères suffisent au client pour se référer à son
  // dossier, et évitent de lui faire recopier un UUID entier.
  return NextResponse.json({ ok: true, ticket: data.id.slice(0, 8).toUpperCase() });
}
