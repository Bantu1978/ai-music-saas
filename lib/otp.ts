import { randomBytes } from "crypto";

/**
 * Mot de passe à usage unique, jamais transmis au client : sert uniquement à
 * échanger un utilisateur vérifié (par eSMS Verify) contre une vraie session
 * Supabase (signInWithPassword côté serveur), voir app/api/auth/otp/verify.
 */
export function generateOneTimePassword(): string {
  return randomBytes(24).toString("base64url");
}
