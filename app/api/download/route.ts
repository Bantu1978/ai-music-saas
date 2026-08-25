import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";

/**
 * Téléchargement du MP3 d'une chanson.
 *
 * L'ancienne version acceptait une URL arbitraire en query string et la
 * récupérait côté serveur : un proxy ouvert (SSRF) permettant de sonder le
 * réseau interne ou les métadonnées cloud depuis l'application.
 *
 * Désormais le client ne transmet qu'un `songId` ; l'URL est relue en base et
 * n'est servie que si la chanson appartient à l'utilisateur connecté.
 */
export async function GET(request: NextRequest) {
  const songId = request.nextUrl.searchParams.get("songId");

  if (!songId) {
    return new NextResponse("songId manquant", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Vous devez être connecté.", { status: 401 });
  }

  const { data: song, error } = await getSupabaseAdmin()
    .from("songs")
    .select("title, audio_url")
    .eq("id", songId)
    .eq("user_id", user.id)
    .single();

  if (error || !song?.audio_url) {
    return new NextResponse("Chanson introuvable", { status: 404 });
  }

  // Défense en profondeur : l'URL vient de notre base, mais elle a été écrite à
  // partir d'une réponse externe. On n'accepte que du HTTPS.
  let target: URL;
  try {
    target = new URL(song.audio_url);
  } catch {
    return new NextResponse("URL de piste invalide", { status: 502 });
  }
  if (target.protocol !== "https:") {
    return new NextResponse("URL de piste invalide", { status: 502 });
  }

  try {
    const upstream = await fetch(target, { signal: AbortSignal.timeout(60_000) });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Échec du téléchargement de l'audio", {
        status: upstream.status || 502,
      });
    }

    const filename = `${(song.title || "bakumelo-track")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .trim() || "bakumelo-track"}.mp3`;

    // Streaming : évite de charger tout le fichier en mémoire côté serveur.
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new NextResponse("Erreur serveur lors de la récupération du fichier", {
      status: 502,
    });
  }
}
