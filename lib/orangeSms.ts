/**
 * Client pour l'API SMS d'Orange (Orange Developer, marché Cameroun).
 *
 * Deux appels : un jeton OAuth2 client_credentials, puis l'envoi proprement
 * dit sur /smsmessaging/v1/outbound/{senderAddress}/requests. Le jeton n'est
 * pas mis en cache ici — un envoi d'OTP est un événement rare (un par
 * connexion), ça ne justifie pas la complexité d'un cache avec expiration.
 */

const TOKEN_URL = process.env.ORANGE_SMS_TOKEN_URL || "https://api.orange.com/oauth/v3/token";
const SEND_URL_BASE =
  process.env.ORANGE_SMS_SEND_URL || "https://api.orange.com/smsmessaging/v1/outbound";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} manquant. Renseignez cette variable dans .env.local (voir .env.example).`);
  }
  return value;
}

async function getAccessToken(): Promise<string> {
  const clientId = requireEnv("ORANGE_SMS_CLIENT_ID");
  const clientSecret = requireEnv("ORANGE_SMS_CLIENT_SECRET");
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Orange OAuth a échoué (${res.status}) : ${body}`);
  }

  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Orange OAuth : réponse sans access_token.");
  }
  return data.access_token;
}

/** `phone` en E.164 (ex: "+237612345678"). */
export async function sendOrangeSms(phone: string, message: string): Promise<void> {
  const senderAddress = requireEnv("ORANGE_SMS_SENDER_ADDRESS");
  const token = await getAccessToken();

  const res = await fetch(`${SEND_URL_BASE}/${encodeURIComponent(senderAddress)}/requests`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      outboundSMSMessageRequest: {
        address: [`tel:${phone}`],
        senderAddress,
        outboundSMSTextMessage: { message },
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Orange SMS a échoué (${res.status}) : ${body}`);
  }
}
