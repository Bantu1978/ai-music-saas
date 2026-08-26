import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Client Notch Pay.
 *
 * Conforme à la spécification OpenAPI publiée sur developer.notchpay.co
 * (version 2.1.0) : base https://api.notchpay.co, clé publique transmise dans
 * l'en-tête `Authorization`, initialisation par POST /payments.
 *
 * Rien ici ne crédite quoi que ce soit : ce module ne fait que parler à
 * Notch Pay. Les décisions sur les crédits vivent dans les routes, qui
 * confrontent toujours la réponse de l'API à ce que la base a enregistré.
 */

const API_BASE = "https://api.notchpay.co";

export type NotchPayment = {
  id?: string;
  /** Référence générée par Notch Pay — la seule qui fonctionne en relecture. */
  reference?: string;
  /** Notre référence, telle que Notch Pay nous la retourne. */
  merchant_reference?: string;
  /** Doublon de merchant_reference, présent dans les retours navigateur. */
  trxref?: string;
  amount?: number;
  currency?: string;
  status?: string;
  customer?: string;
  sandbox?: boolean | number;
  created_at?: string;
  completed_at?: string;
};

type InitInput = {
  amount: number;
  currency: string;
  reference: string;
  description: string;
  callback: string;
  email?: string | null;
  phone?: string | null;
};

export type InitResult =
  | { ok: true; authorizationUrl: string; payment: NotchPayment }
  | { ok: false; error: string };

function publicKey(): string | null {
  const key = (process.env.NOTCHPAY_PUBLIC_KEY || "").trim();
  return key || null;
}

/** Initialise un paiement et renvoie l'URL vers laquelle envoyer le client. */
export async function initializePayment(input: InitInput): Promise<InitResult> {
  const key = publicKey();
  if (!key) return { ok: false, error: "Paiement non configuré (NOTCHPAY_PUBLIC_KEY manquante)." };

  // L'API exige au moins un moyen d'identifier le client : email ou téléphone.
  if (!input.email && !input.phone) {
    return { ok: false, error: "Un email est nécessaire pour initier le paiement." };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/payments`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: input.amount,
        currency: input.currency,
        reference: input.reference,
        description: input.description,
        callback: input.callback,
        ...(input.email ? { email: input.email } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: "Le service de paiement ne répond pas." };
  }

  const raw = await res.text();
  let payload: { authorization_url?: string; transaction?: NotchPayment; message?: string } | null = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = null;
  }

  if (!res.ok || !payload?.authorization_url) {
    return {
      ok: false,
      error: payload?.message || `Le service de paiement a répondu ${res.status}.`,
    };
  }

  return {
    ok: true,
    authorizationUrl: payload.authorization_url,
    payment: payload.transaction ?? {},
  };
}

/**
 * Relit un paiement chez Notch Pay.
 *
 * C'est cette lecture qui fait foi, jamais le corps du webhook : un webhook
 * peut être rejoué, tronqué, ou changer de forme d'une version à l'autre de
 * l'API. Le montant et le statut viennent donc toujours d'ici.
 */
export async function retrievePayment(reference: string): Promise<NotchPayment | null> {
  const key = publicKey();
  if (!key) return null;

  try {
    const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(reference)}`, {
      headers: { Authorization: key },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as { transaction?: NotchPayment } & NotchPayment;
    return payload.transaction ?? payload ?? null;
  } catch {
    return null;
  }
}

/**
 * Un secret de webhook est-il configuré ?
 *
 * Notch Pay n'en délivre pas : ni la création de webhook (POST /webhooks) ni le
 * schéma `Webhook` de leur spécification ne renvoient de secret, et leur
 * documentation n'en montre qu'un espace réservé. La signature est donc
 * facultative ici — voir le commentaire de la route du webhook, qui explique
 * pourquoi cela ne fragilise pas l'attribution des crédits.
 */
export function hasWebhookSecret(): boolean {
  return Boolean((process.env.NOTCHPAY_WEBHOOK_SECRET || "").trim());
}

/**
 * Vérifie la signature d'un webhook, quand un secret est configuré.
 *
 * HMAC-SHA256 hexadécimal du corps **brut** — sérialiser puis re-sérialiser le
 * JSON changerait un espace et invaliderait la comparaison. Comparaison à temps
 * constant, pour ne pas transformer l'égalité en oracle.
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = (process.env.NOTCHPAY_WEBHOOK_SECRET || "").trim();
  if (!secret || !signature) return false;

  const attendu = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  // Hexadécimal comparé sans égard à la casse : l'exemple officiel décode en
  // Buffer hex, ce qui rend 'AB' et 'ab' équivalents. Le faire ici aussi évite
  // de rejeter une signature parfaitement valide.
  const a = Buffer.from(attendu.toLowerCase(), "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");

  // timingSafeEqual exige des longueurs égales : une signature de taille
  // différente est refusée avant même la comparaison.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Statuts renvoyés par Notch Pay que nous considérons comme un encaissement. */
export const PAID_STATUSES = ["complete", "completed", "success", "successful"];

/** Statuts définitivement perdus : le paiement n'aura pas lieu. */
export const DEAD_STATUSES = ["failed", "canceled", "cancelled", "expired", "rejected"];
