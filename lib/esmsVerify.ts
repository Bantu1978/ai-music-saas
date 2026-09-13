/**
 * Client pour l'API eSMS Verify (eSMS Africa), remplace le flux SMS
 * Orange/maison précédent.
 *
 * eSMS Africa gère lui-même le code, son hash et son expiration côté
 * serveur — on ne garde ici que le `verification_id` qui fait le pont entre
 * l'envoi et la vérification. Activation instantanée (pas de sandbox
 * bloquée en attente de validation manuelle comme Orange/MTN).
 */

const BASE_URL = process.env.ESMS_AFRICA_BASE_URL || "https://sms.esmsafrica.io/v1";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant. Renseignez cette variable dans .env.local (voir .env.example).`);
  }
  return value;
}

async function esmsFetch(path: string, body: Record<string, unknown>) {
  const apiKey = requireEnv("ESMS_AFRICA_API_KEY");

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  return { res, data };
}

type EsmsError = { ok: false; status: number; code?: string; message: string };

export type StartVerificationResult =
  | { ok: true; verificationId: string; sandboxCode?: string }
  | EsmsError;

export async function startVerification(phone: string): Promise<StartVerificationResult> {
  const appId = requireEnv("ESMS_AFRICA_APP_ID");
  const { res, data } = await esmsFetch("/verify/start", { to: phone, app_id: appId });

  if (!res.ok) {
    return { ok: false, status: res.status, code: data?.code, message: data?.message ?? JSON.stringify(data) };
  }

  return {
    ok: true,
    verificationId: data.verification_id,
    sandboxCode: typeof data.sandbox_code === "string" ? data.sandbox_code : undefined,
  };
}

export type VerificationStatus = "approved" | "pending" | "failed" | "expired" | "canceled";

export type CheckVerificationResult = { ok: true; status: VerificationStatus } | EsmsError;

export async function checkVerification(
  verificationId: string,
  code: string
): Promise<CheckVerificationResult> {
  const { res, data } = await esmsFetch("/verify/check", { verification_id: verificationId, code });

  if (!res.ok) {
    return { ok: false, status: res.status, code: data?.code, message: data?.message ?? JSON.stringify(data) };
  }

  return { ok: true, status: data.status as VerificationStatus };
}
