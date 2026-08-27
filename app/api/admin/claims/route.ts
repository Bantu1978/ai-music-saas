import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { CLAIM_STATUSES, MESSAGE_MAX, isClaimStatus, type Claim } from "@/lib/claims";

const PAR_PAGE = 20;

/**
 * Boîte de réception des réclamations.
 *
 * La table est fermée par RLS : le navigateur ne peut rien y lire, et tout
 * passe par ici derrière un contrôle d'administrateur. Sans cela, une table de
 * réclamations exposerait les adresses et les litiges de tous les clients.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const params = req.nextUrl.searchParams;
  const statut = params.get("status");
  const recherche = (params.get("q") || "").trim();

  // Les virgules et parenthèses séparent les termes dans la syntaxe `or` de
  // PostgREST : une adresse ou un message en contenant casserait le filtre.
  const terme = recherche.replace(/[,()]/g, " ");
  const ou = `email.ilike.%${terme}%,name.ilike.%${terme}%,reference.ilike.%${terme}%,message.ilike.%${terme}%`;

  // Le total est lu avant la tranche : demander une page hors bornes vaut à
  // PostgREST de répondre 416, et l'écran se viderait sans explication.
  let compte = admin.from("claims").select("id", { count: "exact", head: true });
  if (isClaimStatus(statut)) compte = compte.eq("status", statut);
  if (terme) compte = compte.or(ou);
  const { count } = await compte;

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const page = Math.min(Math.max(1, Number(params.get("page")) || 1), pages);
  const debut = (page - 1) * PAR_PAGE;

  let requete = admin.from("claims").select("*").order("created_at", { ascending: false });
  if (isClaimStatus(statut)) requete = requete.eq("status", statut);
  if (terme) requete = requete.or(ou);
  const { data, error } = await requete.range(debut, debut + PAR_PAGE - 1);

  if (error) {
    console.error("[admin/claims] lecture refusée", error.message);
    return NextResponse.json({ error: "Lecture impossible." }, { status: 500 });
  }

  // Compteurs par statut, pour que l'onglet annonce ce qui reste à traiter.
  const compteurs: Record<string, number> = {};
  for (const s of CLAIM_STATUSES) {
    const { count: c } = await admin
      .from("claims")
      .select("id", { count: "exact", head: true })
      .eq("status", s);
    compteurs[s] = c ?? 0;
  }

  return NextResponse.json({ claims: (data ?? []) as Claim[], page, pages, total, compteurs });
}

/**
 * Avancement d'une réclamation : changement de statut, note interne, ou les
 * deux. La note ne quitte jamais la console — aucun envoi au client n'existe
 * tant qu'aucun SMTP n'est configuré.
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const corps = await req.json().catch(() => null);
  const id = corps?.id;
  if (typeof id !== "string" || !id) {
    return NextResponse.json({ error: "id requis." }, { status: 400 });
  }

  const maj: { status?: string; admin_note?: string | null } = {};
  if (corps.status !== undefined) {
    if (!isClaimStatus(corps.status)) {
      return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
    }
    maj.status = corps.status;
  }
  if (corps.admin_note !== undefined) {
    const n = typeof corps.admin_note === "string" ? corps.admin_note.trim() : "";
    if (n.length > MESSAGE_MAX) {
      return NextResponse.json({ error: "Note trop longue." }, { status: 400 });
    }
    maj.admin_note = n || null;
  }
  if (!Object.keys(maj).length) {
    return NextResponse.json({ error: "Rien à modifier." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("claims")
    .update(maj)
    .eq("id", id)
    .select("*")
    .single<Claim>();

  if (error || !data) {
    console.error("[admin/claims] mise à jour refusée", error?.message);
    return NextResponse.json({ error: "Réclamation introuvable." }, { status: 404 });
  }

  console.info(`[admin/claims] ${id.slice(0, 8)} -> ${data.status} (par ${user!.email})`);
  return NextResponse.json({ ok: true, claim: data });
}
