/**
 * Client pour l'API Cloud WhatsApp de Meta (envoi direct, sans intermédiaire).
 *
 * Utilisé pour l'OTP par WhatsApp via un template "Authentication" — seule
 * catégorie de template dont le texte de base est imposé par Meta
 * ("{{1}} est votre code de vérification"), avec un bouton "Copier le code"
 * (sub_type copy_code) plutôt que "one-tap"/"zero-tap", qui nécessitent une
 * app mobile native.
 *
 * Contrairement aux agrégateurs SMS testés avant (Orange, eSMS Africa), Meta
 * est son propre opérateur final pour WhatsApp : pas de SMSC tiers dont le
 * DLR pourrait mentir sur la livraison réelle.
 */

const API_VERSION = process.env.META_WHATSAPP_API_VERSION || "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${API_VERSION}`;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant. Renseignez cette variable dans .env.local (voir .env.example).`);
  }
  return value;
}

type MetaError = { ok: false; status: number; code?: number; message: string };

export type SendTemplateResult = { ok: true; messageId: string } | MetaError;

/**
 * `phone` en E.164 sans « + » (format canonique de l'app, voir lib/otp.ts).
 * `code` : le code OTP, identique dans le corps du message et le bouton.
 */
export async function sendAuthenticationTemplate(
  phone: string,
  code: string
): Promise<SendTemplateResult> {
  const phoneNumberId = requireEnv("META_WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = requireEnv("META_WHATSAPP_ACCESS_TOKEN");
  const templateName = requireEnv("META_WHATSAPP_TEMPLATE_NAME");
  const languageCode = process.env.META_WHATSAPP_TEMPLATE_LANGUAGE || "fr";

  const res = await fetch(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: code }],
          },
          {
            type: "button",
            sub_type: "copy_code",
            index: "0",
            parameters: [{ type: "coupon_code", coupon_code: code }],
          },
        ],
      },
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      code: data?.error?.code,
      message: data?.error?.message ?? JSON.stringify(data),
    };
  }

  const messageId = data?.messages?.[0]?.id;
  if (!messageId) {
    return { ok: false, status: res.status, message: "Réponse sans identifiant de message." };
  }

  return { ok: true, messageId };
}
