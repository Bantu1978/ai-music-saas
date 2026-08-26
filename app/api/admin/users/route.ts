import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

/** Nombre de mouvements de crédits remontés au journal. */
const TRANSACTIONS_LIMIT = 25;

/**
 * Ligne de `credit_transactions` accompagnée du profil joint.
 *
 * PostgREST renvoie une relation « plusieurs vers un » sous forme d'objet, mais
 * le typage de supabase-js ne le garantit pas sans types générés : les deux
 * formes sont acceptées ici, et aplaties avant d'atteindre le client.
 */
type TransactionRow = {
  id: string;
  amount: number;
  description: string | null;
  created_at: string;
  profiles: ProfileRef | ProfileRef[] | null;
};

type ProfileRef = { email: string | null; full_name: string | null };

function firstProfile(profiles: TransactionRow["profiles"]): ProfileRef | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const admin = getSupabaseAdmin();

  const [
    { data: profiles, error: profilesError },
    { data: songs, error: songsError },
    { data: rawTransactions, error: transactionsError },
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, email, full_name, credits, created_at")
      .order("created_at", { ascending: false }),
    admin
      .from("songs")
      .select("id, title, genre, status, audio_url, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    admin
      .from("credit_transactions")
      .select("id, amount, description, created_at, profiles(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(TRANSACTIONS_LIMIT),
  ]);

  if (profilesError || songsError || transactionsError) {
    return NextResponse.json(
      {
        error:
          profilesError?.message || songsError?.message || transactionsError?.message,
      },
      { status: 500 }
    );
  }

  // Aplatissement du profil joint : le client reçoit un libellé prêt à afficher
  // plutôt qu'une relation dont il devrait connaître la forme.
  const transactions = ((rawTransactions ?? []) as TransactionRow[]).map((row) => {
    const profile = firstProfile(row.profiles);
    return {
      id: row.id,
      amount: row.amount,
      description: row.description,
      createdAt: row.created_at,
      user: profile?.email || profile?.full_name || null,
    };
  });

  return NextResponse.json({ profiles, songs, transactions });
}
