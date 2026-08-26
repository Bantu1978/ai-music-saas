import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { adjustCredits } from "@/lib/credits";
import { SONG_STATUS } from "@/lib/songStatus";
import { fetchSunoTask } from "@/lib/suno";
import { isAdmin } from "@/lib/admin";

/**
 * Rattrapage des générations restées en attente.
 *
 * Une génération dont l'auteur ferme son onglet n'est plus jamais réconciliée :
 * le crédit est débité, la ligne reste en `pending`, et le morceau — souvent
 * bel et bien terminé chez Suno — n'est jamais rattaché. Cette route donne à
 * l'administrateur les deux issues possibles.
 *
 *   reconcile — redemande l'état à Suno. Si le morceau existe, il est rattaché
 *               et le client le retrouve dans ses créations, sans qu'un crédit
 *               ait été gaspillé. Si Suno déclare l'échec, le crédit est rendu.
 *   refund    — abandonne la génération et rend le crédit, pour les cas
 *               irrécupérables (aucune référence de tâche, tâche trop ancienne).
 *
 * Toutes les écritures sont conditionnées au statut `pending` : un second clic
 * ne trouve plus rien à modifier et ne peut donc pas créditer deux fois.
 */

type Action = "reconcile" | "refund";

type SongRow = {
  id: string;
  user_id: string;
  title: string | null;
  status: string | null;
  task_id: string | null;
};

/**
 * Abandonne la génération et rend le crédit, si et seulement si elle est encore
 * en attente. Le passage `pending -> failed` sert de verrou : c'est lui qui rend
 * l'opération non rejouable.
 */
async function refundSong(
  admin: ReturnType<typeof getSupabaseAdmin>,
  song: SongRow,
  adminEmail: string
) {
  const { data: locked, error } = await admin
    .from("songs")
    .update({ status: SONG_STATUS.failed })
    .eq("id", song.id)
    .eq("status", SONG_STATUS.pending)
    .select("id");

  if (error) {
    return { ok: false as const, status: 500, error: error.message };
  }
  if (!locked || locked.length === 0) {
    // Une autre requête est passée avant : ne surtout pas créditer.
    return { ok: false as const, status: 409, error: "Génération déjà traitée." };
  }

  const credit = await adjustCredits(admin, song.user_id, 1);
  if (!credit.ok) {
    console.error("[admin/songs] remboursement refusé :", credit.reason);
    return { ok: false as const, status: 500, error: "Remboursement impossible." };
  }

  await admin.from("credit_transactions").insert({
    user_id: song.user_id,
    amount: 1,
    description: `Remboursement d'une génération bloquée: ${song.title ?? "sans titre"} (par ${adminEmail})`,
  });

  return { ok: true as const, outcome: "refunded" as const, credits: credit.credits };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const songId = body?.songId;
  const action = body?.action as Action;

  if (typeof songId !== "string" || !songId) {
    return NextResponse.json({ error: "songId requis." }, { status: 400 });
  }
  if (action !== "reconcile" && action !== "refund") {
    return NextResponse.json({ error: "Action inconnue." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: song, error: songError } = await admin
    .from("songs")
    .select("id, user_id, title, status, task_id")
    .eq("id", songId)
    .maybeSingle<SongRow>();

  if (songError) {
    return NextResponse.json({ error: songError.message }, { status: 500 });
  }
  if (!song) {
    return NextResponse.json({ error: "Génération introuvable." }, { status: 404 });
  }
  if (song.status !== SONG_STATUS.pending) {
    return NextResponse.json(
      { error: "Cette génération n'est plus en attente." },
      { status: 409 }
    );
  }

  const adminEmail = user!.email ?? "administrateur";

  if (action === "refund") {
    const result = await refundSong(admin, song, adminEmail);
    return result.ok
      ? NextResponse.json(result)
      : NextResponse.json({ error: result.error }, { status: result.status });
  }

  // reconcile
  if (!song.task_id) {
    return NextResponse.json(
      { error: "Aucune référence de tâche : seul le remboursement est possible." },
      { status: 400 }
    );
  }

  const apiKey = process.env.SUNO_API_KEY || process.env.GOAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API manquante." }, { status: 500 });
  }

  const result = await fetchSunoTask(song.task_id, apiKey);

  if (result.status === "SUCCESS") {
    const { data: locked, error } = await admin
      .from("songs")
      .update({
        audio_url: result.audioUrl,
        status: SONG_STATUS.completed,
        ...(result.lyrics ? { lyrics: result.lyrics } : {}),
        ...(result.title ? { title: result.title } : {}),
      })
      .eq("id", song.id)
      .eq("status", SONG_STATUS.pending)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!locked || locked.length === 0) {
      return NextResponse.json({ error: "Génération déjà traitée." }, { status: 409 });
    }

    // Aucun mouvement de crédit : le morceau a bien été produit, il est
    // simplement rattaché avec retard.
    return NextResponse.json({ ok: true, outcome: "completed" });
  }

  if (result.status === "FAILED") {
    const refund = await refundSong(admin, song, adminEmail);
    return refund.ok
      ? NextResponse.json({ ...refund, sunoError: result.error })
      : NextResponse.json({ error: refund.error }, { status: refund.status });
  }

  return NextResponse.json({ ok: true, outcome: "still_pending" });
}
