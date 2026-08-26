import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { SONG_STATUS } from "@/lib/songStatus";
import { configHealth } from "@/lib/configHealth";

/** Nombre de mouvements de crédits remontés au journal. */
const TRANSACTIONS_LIMIT = 25;

/** Utilisateurs affichés par page. */
const PAGE_SIZE = 20;

/** Générations en attente remontées au triage. */
const STUCK_LIMIT = 30;

/** Paiements en attente remontés au triage. */
const PENDING_PAYMENTS_LIMIT = 30;

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

/** Paiement ouvert et jamais dénoué, avec son acheteur. */
type PendingPaymentRow = {
  reference: string;
  pack: string;
  credits: number;
  amount: number;
  currency: string;
  provider_reference: string | null;
  created_at: string;
  profiles: ProfileRef | ProfileRef[] | null;
};

/** Génération restée en attente, avec son propriétaire. */
type StuckRow = {
  id: string;
  title: string | null;
  genre: string | null;
  task_id: string | null;
  created_at: string;
  profiles: ProfileRef | ProfileRef[] | null;
};

function firstProfile(profiles: TransactionRow["profiles"]): ProfileRef | null {
  if (!profiles) return null;
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles;
}

/**
 * Prépare un terme de recherche pour un filtre `ilike` de PostgREST.
 *
 * Deux grammaires se superposent et doivent être neutralisées :
 *   - celle du filtre `or(...)`, où la virgule sépare les termes et les
 *     parenthèses délimitent le groupe : une recherche contenant « a,b »
 *     produirait sinon une requête au sens tout autre, voire invalide ;
 *   - celle des motifs LIKE, où `%`, `_` et `*` sont des jokers.
 *
 * Ces caractères sont retirés plutôt qu'échappés : dans un champ de recherche,
 * les perdre est sans conséquence, alors qu'un échappement mal ficelé laisse
 * une faille. Renvoie `null` s'il ne reste rien de cherchable.
 */
function searchPattern(term: string): string | null {
  const cleaned = term.replace(/[%_*,()"\\]/g, " ").trim();
  return cleaned ? `%${cleaned}%` : null;
}

/** Filtre commun au comptage et à la page de données : une seule formulation. */
function orFilter(pattern: string): string {
  return `email.ilike.${pattern},full_name.ilike.${pattern}`;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const pattern = searchPattern(searchParams.get("q") || "");
  const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const admin = getSupabaseAdmin();

  // Le total est demandé séparément, et d'abord, pour pouvoir ramener une page
  // hors bornes dans le domaine valide. PostgREST répond 416 (PGRST103) sur un
  // `range` au-delà de la fin : sans ce garde-fou, une page devenue vide — parce
  // qu'un compte a été supprimé, ou parce qu'une recherche a réduit le nombre de
  // résultats — remonterait au client comme une erreur serveur.
  let countQuery = admin.from("profiles").select("id", { count: "exact", head: true });
  if (pattern) countQuery = countQuery.or(orFilter(pattern));

  const [
    { count, error: countError },
    { data: songs, error: songsError },
    { data: rawTransactions, error: transactionsError },
    { data: rawStuck, error: stuckError },
    { data: rawPending, error: pendingError },
  ] = await Promise.all([
    countQuery,
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
    // Générations jamais réconciliées : l'onglet du client s'est fermé avant la
    // fin, le crédit est débité et le morceau n'a jamais été rattaché.
    admin
      .from("songs")
      .select("id, title, genre, task_id, created_at, profiles(email, full_name)")
      .eq("status", SONG_STATUS.pending)
      .order("created_at", { ascending: false })
      .limit(STUCK_LIMIT),
    // Paiements ouverts et jamais dénoués. Depuis que seul le webhook crédite,
    // un webhook perdu laisse un client qui a payé sans ses crédits : c'est ici
    // que cela doit se voir.
    admin
      .from("payments")
      .select("reference, pack, credits, amount, currency, provider_reference, created_at, profiles(email, full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(PENDING_PAYMENTS_LIMIT),
  ]);

  if (countError || songsError || transactionsError || stuckError || pendingError) {
    return NextResponse.json(
      {
        error:
          countError?.message ||
          songsError?.message ||
          transactionsError?.message ||
          stuckError?.message ||
          pendingError?.message,
      },
      { status: 500 }
    );
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const from = (page - 1) * PAGE_SIZE;

  let profilesQuery = admin
    .from("profiles")
    .select("id, email, full_name, credits, created_at")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (pattern) profilesQuery = profilesQuery.or(orFilter(pattern));

  const { data: profiles, error: profilesError } = await profilesQuery;

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
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

  const stuckSongs = ((rawStuck ?? []) as StuckRow[]).map((row) => {
    const profile = firstProfile(row.profiles);
    return {
      id: row.id,
      title: row.title,
      genre: row.genre,
      createdAt: row.created_at,
      // La référence de tâche n'est pas exposée telle quelle : seule compte,
      // côté console, l'existence d'un recours auprès de Suno.
      recoverable: Boolean(row.task_id),
      user: profile?.email || profile?.full_name || null,
    };
  });

  const pendingPayments = ((rawPending ?? []) as PendingPaymentRow[]).map((row) => {
    const profile = firstProfile(row.profiles);
    return {
      reference: row.reference,
      pack: row.pack,
      credits: row.credits,
      amount: row.amount,
      currency: row.currency,
      createdAt: row.created_at,
      // Sans référence fournisseur, l'ouverture n'a jamais abouti : il n'y a
      // rien à vérifier chez Notch Pay.
      checkable: Boolean(row.provider_reference),
      user: profile?.email || profile?.full_name || null,
    };
  });

  return NextResponse.json({
    config: configHealth(),
    pendingPayments,
    profiles,
    total,
    // Page effectivement servie : elle peut différer de celle demandée si
    // celle-ci dépassait la fin. Le client s'aligne dessus.
    page,
    pageSize: PAGE_SIZE,
    songs,
    transactions,
    stuckSongs,
  });
}
