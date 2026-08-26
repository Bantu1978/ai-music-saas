import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { SONG_STATUS } from "@/lib/songStatus";
import { fetchSunoTask } from "@/lib/suno";

/**
 * Suivi d'une génération Suno.
 *
 * Remplace l'ancien couple /api/generate/status + /api/custom_generate, qui
 * interrogeaient deux endpoints différents (dont un inexistant) et divergeaient
 * sur la forme de réponse.
 *
 * `songId` est optionnel : quand il est fourni, le résultat est aussi persisté
 * sur la ligne `songs` correspondante, à condition qu'elle appartienne bien à
 * l'utilisateur connecté.
 *
 * La lecture de l'état chez Suno vit dans lib/suno.ts, partagée avec le
 * rattrapage administrateur : les deux doivent conclure identiquement sur une
 * même tâche.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const songId = searchParams.get("songId");

  if (!taskId) {
    return NextResponse.json({ error: "taskId requis" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
  }

  const apiKey = process.env.SUNO_API_KEY || process.env.GOAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
  }

  const result = await fetchSunoTask(taskId, apiKey);

  if (result.status === "SUCCESS") {
    if (songId) {
      const { error } = await getSupabaseAdmin()
        .from("songs")
        .update({
          audio_url: result.audioUrl,
          status: SONG_STATUS.completed,
          ...(result.lyrics ? { lyrics: result.lyrics } : {}),
          ...(result.title ? { title: result.title } : {}),
        })
        .eq("id", songId)
        .eq("user_id", user.id);

      if (error) {
        // Non bloquant pour l'écoute immédiate, mais le téléchargement repose
        // sur `audio_url` : un échec ici doit être visible.
        console.error(`[status] persistance échouée (${error.code}) : ${error.message}`);
      }
    }

    return NextResponse.json({
      status: "SUCCESS",
      song: {
        id: taskId,
        audioUrl: result.audioUrl,
        lyrics: result.lyrics,
        title: result.title,
      },
    });
  }

  if (result.status === "FAILED") {
    if (songId) {
      await getSupabaseAdmin()
        .from("songs")
        .update({ status: SONG_STATUS.failed })
        .eq("id", songId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ status: "FAILED", error: result.error });
  }

  return NextResponse.json({ status: "PENDING" });
}
