import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/fr/generate";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirection directe vers la page studio avec la langue
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/' + next}`);
    }
  }

  return NextResponse.redirect(`${origin}/fr`);
}