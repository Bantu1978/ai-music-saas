import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { adjustCredits } from "@/lib/credits";
import { SONG_STATUS } from "@/lib/songStatus";
import { isAdmin } from "@/lib/admin";
import type { SunoGenerateResponse } from "@/lib/suno";

const SUNO_GENERATE_URL = "https://api.sunoapi.org/api/v1/generate";
const MAX_PROMPT_LENGTH = 2000;

/**
 * Base publique de l'application, utilisée pour construire le callBackUrl.
 *
 * Lue sous deux noms : APP_URL (nom retenu côté Vercel, et le bon puisque cette
 * valeur ne sert que côté serveur) et NEXT_PUBLIC_APP_URL (nom historique,
 * conservé pour .env.local). Un repli sur localhost garantit une URL absolue :
 * l'API refuse un chemin relatif.
 */
function appBaseUrl(): string {
  const raw = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentification : l'utilisateur vient de la session, jamais du body.
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Vous devez être connecté." }, { status: 401 });
    }

    const userId = user.id;

    // 2. Validation de l'entrée
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
    }

    const { prompt, genre, mood, title, lyrics } = body as Record<string, unknown>;

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "Le sujet de la chanson est requis." }, { status: 400 });
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `Le sujet ne peut pas dépasser ${MAX_PROMPT_LENGTH} caractères.` },
        { status: 400 }
      );
    }

    const apiKey = process.env.SUNO_API_KEY || process.env.GOAPI_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Service de génération non configuré (SUNO_API_KEY manquante)." },
        { status: 500 }
      );
    }

    const admin = getSupabaseAdmin();

    const safeGenre = typeof genre === "string" && genre.trim() ? genre.trim() : "Afrobeats";
    const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "Sans titre";
    const safeMood = typeof mood === "string" && mood.trim() ? mood.trim() : "Energetic";
    const safeLyrics = typeof lyrics === "string" && lyrics.trim() ? lyrics.trim() : null;

    // 3. Réservation du crédit AVANT l'appel externe (évite la double génération),
    //    remboursé plus bas si Suno refuse la tâche.
    //
    //    Les administrateurs échappent au décompte : ils doivent pouvoir
    //    éprouver la chaîne de génération en production sans qu'un solde vide
    //    les arrête, et sans s'accorder des crédits pour cela.
    const unlimited = isAdmin(user);
    let creditsRemaining: number | null = null;

    if (!unlimited) {
      const reservation = await adjustCredits(admin, userId, -1);

      if (!reservation.ok) {
        if (reservation.reason === "not_found") {
          return NextResponse.json({ error: "Profil utilisateur introuvable." }, { status: 404 });
        }
        if (reservation.reason === "insufficient") {
          return NextResponse.json({ error: "Crédits insuffisants." }, { status: 403 });
        }
        if (reservation.reason === "error") {
          // Refus de la base (trigger, contrainte, RLS) : à ne pas maquiller en
          // problème de concurrence, le message est nécessaire au diagnostic.
          console.error("[generate] débit refusé par la base :", reservation.message);
          return NextResponse.json(
            { error: `Débit du crédit refusé : ${reservation.message}` },
            { status: 500 }
          );
        }
        return NextResponse.json(
          { error: "Génération déjà en cours, veuillez réessayer." },
          { status: 409 }
        );
      }

      creditsRemaining = reservation.credits;
    }

    // 4. Trace de la chanson en statut 'pending'
    const fullPrompt = `${safeGenre} — ${prompt.trim()}`;

    const { data: song, error: songError } = await admin
      .from("songs")
      .insert({
        user_id: userId,
        title: safeTitle,
        genre: safeGenre,
        mood: safeMood,
        prompt_used: fullPrompt,
        lyrics: safeLyrics,
        status: SONG_STATUS.pending,
      })
      .select()
      .single();

    if (songError || !song) {
      if (!unlimited) await adjustCredits(admin, userId, 1); // remboursement
      return NextResponse.json(
        { error: "Erreur lors de la création de la chanson." },
        { status: 500 }
      );
    }

    // 5. Appel réel à l'API Suno.
    //    Mode non-custom : Suno écrit les paroles et chante à partir de la description,
    //    le genre et le titre souhaités sont donc injectés dans cette description.
    const description = safeLyrics
      ? `Chanson ${safeGenre}, ambiance ${safeMood}, intitulée "${safeTitle}". Paroles imposées :\n${safeLyrics}`
      : `Chanson ${safeGenre}, ambiance ${safeMood}, intitulée "${safeTitle}". Sujet : ${prompt.trim()}`;

    let taskId: string | undefined;
    let sunoError = "La génération n'a pas pu être lancée.";

    try {
      const sunoRes = await fetch(SUNO_GENERATE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: description,
          customMode: false,
          instrumental: false,
          model: process.env.SUNO_MODEL || "V4_5",
          // Champ exigé par l'API. Le suivi se fait ici par polling
          // (/api/generate/status), ce webhook n'est pas encore implémenté —
          // mais l'URL doit rester absolue, sous peine de rejet de la requête.
          callBackUrl: `${appBaseUrl()}/api/suno/callback`,
        }),
        signal: AbortSignal.timeout(30_000),
      });

      const raw = await sunoRes.text();
      let payload: SunoGenerateResponse | null = null;
      try {
        payload = JSON.parse(raw) as SunoGenerateResponse;
      } catch {
        payload = null;
      }

      taskId = payload?.data?.taskId || payload?.data?.task_id || payload?.taskId;

      if (!sunoRes.ok || !taskId) {
        sunoError = payload?.msg || payload?.error || `Suno a répondu ${sunoRes.status}.`;
      }
    } catch (err) {
      sunoError =
        err instanceof Error && err.name === "TimeoutError"
          ? "Le service de génération ne répond pas."
          : "Impossible de contacter le service de génération.";
    }

    // 6. Échec côté Suno : on rembourse le crédit et on marque la chanson en échec.
    if (!taskId) {
      await admin.from("songs").update({ status: SONG_STATUS.failed }).eq("id", song.id);
      if (!unlimited) await adjustCredits(admin, userId, 1);
      return NextResponse.json({ error: sunoError }, { status: 502 });
    }

    // Persistance du taskId (best-effort : ignorée si la colonne n'existe pas en base)
    const { error: taskIdError } = await admin
      .from("songs")
      .update({ task_id: taskId })
      .eq("id", song.id);
    if (taskIdError) {
      console.warn("[generate] task_id non persisté :", taskIdError.message);
    }

    // 7. Journal de la transaction de crédit — rien à journaliser quand aucun
    //    crédit n'a été débité.
    if (!unlimited) {
      await admin.from("credit_transactions").insert({
        user_id: userId,
        amount: -1,
        description: `Génération de la chanson: ${song.title}`,
      });
    }

    return NextResponse.json({
      success: true,
      taskId,
      songId: song.id,
      prompt: fullPrompt,
      // null pour un administrateur : le client laisse alors son affichage
      // de solde inchangé.
      creditsRemaining,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    console.error("[generate]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
