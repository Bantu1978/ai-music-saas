import { NextResponse } from "next/server";

/**
 * Webhook Meta pour le canal WhatsApp Cloud API.
 *
 * GET : poignée de main de vérification exigée par Meta à l'enregistrement
 * de l'URL (Dashboard > WhatsApp > Configuration > Webhooks) — elle doit
 * renvoyer littéralement `hub.challenge` si `hub.verify_token` correspond.
 *
 * POST : notifications de statut (sent/delivered/read/failed) et messages
 * entrants. Simple journalisation pour l'instant — sert de preuve que Meta
 * livre réellement (contrairement aux DLR non fiables d'Orange/eSMS Africa).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expectedToken && token === expectedToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Vérification échouée." }, { status: 403 });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  console.log("[whatsapp webhook] notification:", JSON.stringify(body));

  return NextResponse.json({ ok: true });
}
