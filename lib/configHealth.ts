/**
 * État de la configuration, vu depuis le serveur qui tourne réellement.
 *
 * Existe parce que l'oubli d'une variable d'environnement est silencieux : rien
 * ne le signale jusqu'à ce qu'un client tombe dessus. C'est arrivé avec
 * NOTCHPAY_PUBLIC_KEY, présente en local et absente de Vercel — un achat sur
 * deux échouait sans que rien ne l'annonce.
 *
 * Deux règles absolues :
 *   - aucune valeur de secret ne sort d'ici, jamais, même tronquée ;
 *   - ce qui est montré l'est parce que c'est utile ET inoffensif : une adresse
 *     publique, un nom de modèle, un interrupteur.
 *
 * Le rapport reflète la configuration *effective*, pas la simple présence d'un
 * nom : plusieurs réglages acceptent des noms alternatifs, et savoir lequel a
 * été retenu vaut mieux qu'une case cochée.
 */

export type ConfigStatut = "ok" | "manquant" | "attention";

export type ConfigEntree = {
  id: string;
  /** Ce que le réglage permet, formulé côté exploitation. */
  intitule: string;
  /** Le service est-il inutilisable sans ? */
  requis: boolean;
  statut: ConfigStatut;
  /** Nom de variable réellement retenu, parmi les noms acceptés. */
  source: string | null;
  /** Tous les noms acceptés, pour savoir quoi renseigner. */
  noms: string[];
  /** Valeur ou observation montrable sans risque. Jamais un secret. */
  note: string | null;
};

/** Premier nom renseigné, parmi ceux acceptés. */
function premier(noms: string[]): { source: string; valeur: string } | null {
  for (const nom of noms) {
    const valeur = (process.env[nom] || "").trim();
    if (valeur) return { source: nom, valeur };
  }
  return null;
}

function entree(
  id: string,
  intitule: string,
  noms: string[],
  requis: boolean,
  observer?: (valeur: string) => { statut?: ConfigStatut; note?: string } | null,
  noteAbsence?: string
): ConfigEntree {
  const trouve = premier(noms);

  if (!trouve) {
    return {
      id,
      intitule,
      requis,
      statut: requis ? "manquant" : "ok",
      source: null,
      noms,
      note: requis ? null : noteAbsence ?? "facultatif",
    };
  }

  const observation = observer?.(trouve.valeur) ?? null;
  return {
    id,
    intitule,
    requis,
    statut: observation?.statut ?? "ok",
    source: trouve.source,
    noms,
    note: observation?.note ?? null,
  };
}

export function configHealth(): ConfigEntree[] {
  return [
    entree("supabase_url", "Base de données (navigateur)", ["NEXT_PUBLIC_SUPABASE_URL"], true),
    entree(
      "supabase_public",
      "Clé publique Supabase",
      ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      true
    ),
    entree("supabase_service", "Clé de service Supabase", ["SUPABASE_SERVICE_ROLE_KEY"], true),

    entree("suno", "Génération musicale", ["SUNO_API_KEY", "GOAPI_KEY"], true),
    entree("suno_model", "Modèle de génération", ["SUNO_MODEL"], false, (v) => ({
      note: v,
    })),

    entree("app_url", "Adresse publique du site", ["APP_URL", "NEXT_PUBLIC_APP_URL"], true, (v) => {
      // Une adresse locale en production casse deux choses d'un coup : le retour
      // de paiement et le rappel de Suno. Le dire vaut mieux qu'une case verte.
      const locale = /localhost|127\.0\.0\.1/i.test(v);
      return locale
        ? { statut: "attention", note: `${v} — inutilisable en production` }
        : { note: v };
    }),

    entree("admins", "Administrateurs autorisés", ["ADMIN_EMAILS"], true, (v) => {
      const nombre = v.split(",").filter((e) => e.trim()).length;
      return { note: `${nombre} compte(s)` };
    }),

    entree("notchpay", "Encaissement des paiements", ["NOTCHPAY_PUBLIC_KEY"], true, (v) => {
      // Le préfixe de la clé dit si de l'argent réel peut circuler. C'est
      // l'information la plus utile du panneau, et elle ne révèle rien.
      if (v.startsWith("pk_test")) return { note: "clé de test — aucun montant réel" };
      if (v.startsWith("pk_live")) return { statut: "attention", note: "clé réelle — les paiements sont encaissés" };
      return { note: "clé non reconnue" };
    }),

    entree(
      "notchpay_secret",
      "Signature des webhooks",
      ["NOTCHPAY_WEBHOOK_SECRET"],
      false,
      () => ({ note: "vérification stricte activée" }),
      "Notch Pay n'en délivre pas — sans effet sur la sécurité"
    ),

    entree("maintenance", "Mode « site en construction »", ["MAINTENANCE_MODE"], false, (v) => {
      const actif = ["1", "true", "on"].includes(v.toLowerCase());
      return actif
        ? { statut: "attention", note: "ACTIF — le site est fermé aux visiteurs" }
        : { note: "inactif" };
    }),
  ];
}
