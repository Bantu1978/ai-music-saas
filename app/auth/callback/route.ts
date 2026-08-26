import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { ensureProfile } from "@/lib/profile";

// N'autorise que des chemins internes ("/fr/generate"), jamais "//evil.com" ni une URL absolue
function safeNext(raw: string | null): string {
  if (!raw) return "/fr/generate";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/fr/generate";
  return raw;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (data.user) {
        await ensureProfile(getSupabaseAdmin(), data.user);
      }
      // Redirection directe vers la page studio avec la langue
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/fr`);
}
