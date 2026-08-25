import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  try {
    const { userId, prompt, genre, mood, title, lyrics } = await req.json();

    if (!userId || !prompt) {
      return NextResponse.json({ error: "userId et prompt sont requis." }, { status: 400 });
    }

    // A. Vérifier les crédits de l'utilisateur
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Utilisateur non trouvé." }, { status: 404 });
    }

    if (profile.credits < 1) {
      return NextResponse.json({ error: "Crédits insuffisants." }, { status: 403 });
    }

    // B. Créer l'entrée dans la table 'songs' en statut 'pending'
    const { data: song, error: songError } = await supabaseAdmin
      .from("songs")
      .insert({
        user_id: userId,
        title: title || "Sans titre",
        genre: genre || "Pop",
        mood: mood || "Energetic",
        prompt_used: prompt,
        lyrics: lyrics || null,
        status: "pending",
      })
      .select()
      .single();

    if (songError) {
      return NextResponse.json({ error: "Erreur lors de la création de la chanson." }, { status: 500 });
    }

    // C. Déduire 1 crédit de l'utilisateur
    await supabaseAdmin
      .from("profiles")
      .update({ credits: profile.credits - 1 })
      .eq("id", userId);

    // D. Enregistrer la transaction de crédit
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: userId,
      amount: -1,
      description: `Génération de la chanson: ${song.title}`,
    });

    // E. Lancer l'appel vers Suno API (GoAPI / SunoAPI)
    // ... Votre appel API Suno ici ...

    return NextResponse.json({ success: true, songId: song.id });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}