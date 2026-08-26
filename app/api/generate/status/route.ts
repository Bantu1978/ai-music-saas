import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { SONG_STATUS } from "@/lib/songStatus";

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

  try {
    const res = await fetch(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
      {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        signal: AbortSignal.timeout(20_000),
      }
    );

    const raw = await res.text();
    let payload: any = null;
    try {
      payload = JSON.parse(raw);
    } catch {
      // Réponse non-JSON : traitée comme un état transitoire.
      return NextResponse.json({ status: "PENDING" });
    }

    const taskData = payload?.data ?? {};
    const status = taskData.status;

    if (status === "SUCCESS" && taskData.response) {
      const sunoData = taskData.response.sunoData || taskData.response;
      const clips = Array.isArray(sunoData) ? sunoData : Object.values(sunoData);
      const clip = clips[0] as any;

      const audioUrl =
        clip?.audioUrl || clip?.audio_url || clip?.stream_url || clip?.cdn_url;

      if (audioUrl) {
        const lyrics = clip?.metadata?.prompt || clip?.lyric || clip?.prompt || null;
        const title = clip?.title || null;

        if (songId) {
          const { error } = await getSupabaseAdmin()
            .from("songs")
            .update({
              audio_url: audioUrl,
              status: SONG_STATUS.completed,
              ...(lyrics ? { lyrics } : {}),
              ...(title ? { title } : {}),
            })
            .eq("id", songId)
            .eq("user_id", user.id);

          if (error) {
            // Non bloquant pour l'écoute immédiate, mais le téléchargement
            // repose sur `audio_url` : un échec ici doit être visible.
            console.error(
              `[status] persistance échouée (${error.code}) : ${error.message}`
            );
          }
        }

        return NextResponse.json({
          status: "SUCCESS",
          song: { id: taskId, audioUrl, lyrics, title },
        });
      }
    }

    if (status === "FAILED" || status === "CREATE_TASK_FAILED") {
      if (songId) {
        await getSupabaseAdmin()
          .from("songs")
          .update({ status: SONG_STATUS.failed })
          .eq("id", songId)
          .eq("user_id", user.id);
      }

      return NextResponse.json({
        status: "FAILED",
        error: taskData.errorMessage || "La génération a échoué chez Suno.",
      });
    }

    return NextResponse.json({ status: status || "PENDING" });
  } catch (error: unknown) {
    // Incident réseau transitoire : on reste en PENDING, le client réessaiera
    // jusqu'à sa limite de tentatives plutôt que d'échouer au premier hoquet.
    console.warn("[status]", error instanceof Error ? error.message : error);
    return NextResponse.json({ status: "PENDING" });
  }
}
