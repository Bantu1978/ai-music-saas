import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  const [{ data: profiles, error: profilesError }, { data: songs, error: songsError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, email, full_name, credits, created_at")
        .order("created_at", { ascending: false }),
      admin
        .from("songs")
        .select("id, title, genre, status, audio_url, created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (profilesError || songsError) {
    return NextResponse.json(
      { error: profilesError?.message || songsError?.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ profiles, songs });
}
