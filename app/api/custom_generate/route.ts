import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const songId = searchParams.get("songId");

  if (!taskId || !songId) {
    return NextResponse.json({ error: "taskId et songId requis" }, { status: 400 });
  }

  try {
    const apiKey = process.env.SUNO_API_KEY || process.env.GOAPI_KEY;
    const response = await fetch(`https://api.sunoapi.org/api/v1/task/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await response.json();

    // Traitement une fois la génération terminée par Suno
    if (data.status === "SUCCESS" || data.status === "complete") {
      const audioUrl = data.data?.audio_url || data.audio_url;

      await supabaseAdmin
        .from("songs")
        .update({
          audio_url: audioUrl,
          status: "success", // Assurez-vous que cette valeur correspond à votre ENUM song_status dans Supabase
        })
        .eq("id", songId);
    } else if (data.status === "FAILED") {
      await supabaseAdmin
        .from("songs")
        .update({ status: "failed" })
        .eq("id", songId);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}