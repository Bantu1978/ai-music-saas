import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

/**
 * Statut administrateur de l'utilisateur courant.
 *
 * Le navigateur ne peut pas évaluer `isAdmin` lui-même : ADMIN_EMAILS est
 * volontairement une variable serveur (pas de préfixe NEXT_PUBLIC), pour que la
 * liste des administrateurs ne soit pas exposée. Cette route ne renvoie qu'un
 * booléen portant sur l'appelant, jamais la liste.
 *
 * Purement cosmétique : elle sert à afficher ou masquer le lien « Admin » dans
 * l'en-tête. La protection réelle reste côté serveur, sur la page /admin et sur
 * chaque route /api/admin/*, qui revérifient toutes `isAdmin`.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json({ isAdmin: isAdmin(user) });
}
