import { createHash, randomBytes, randomInt } from "crypto";

/** Durée de validité d'un code avant qu'il faille en redemander un. */
export const OTP_TTL_MS = 5 * 60 * 1000;

/** Délai minimum entre deux envois pour un même numéro. */
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Tentatives de saisie autorisées avant qu'un code soit invalidé. */
export const OTP_MAX_ATTEMPTS = 5;

export const OTP_LENGTH = 6;

export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

function pepper(): string {
  const secret = process.env.OTP_HASH_SECRET;
  if (!secret) {
    throw new Error(
      "OTP_HASH_SECRET manquant. Renseignez cette variable dans .env.local (voir .env.example)."
    );
  }
  return secret;
}

/** Hash lié au numéro : un même code sur deux numéros produit deux hash différents. */
export function hashOtpCode(code: string, phone: string): string {
  return createHash("sha256").update(`${pepper()}:${phone}:${code}`).digest("hex");
}

/**
 * Mot de passe à usage unique, jamais transmis au client : sert uniquement à
 * échanger un utilisateur vérifié contre une vraie session Supabase
 * (signInWithPassword côté serveur), voir app/api/auth/otp/verify.
 */
export function generateOneTimePassword(): string {
  return randomBytes(24).toString("base64url");
}
