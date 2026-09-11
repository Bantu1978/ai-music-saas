import { NextResponse } from "next/server";

/**
 * Callback de statut de livraison (DLR) attendu par l'API SMS Orange.
 *
 * Contrat imposé par Orange (voir developer.orange.com/apis/sms/getting-started) :
 * POST avec un corps `deliveryInfoNotification`, réponse 200 OK obligatoire
 * pour accuser réception. Aucune authentification n'est documentée pour cet
 * appel côté Orange — l'URL est simplement pré-enregistrée puis whitelistée
 * sur leur serveur SMS API, ce qui limite déjà qui peut l'appeler utilement.
 *
 * Se contente de journaliser la notification : elle sert surtout de preuve
 * qu'Orange livre réellement les SMS une fois l'app passée en production
 * (voir resourceURL loggé dans lib/orangeSms.ts, actuellement sur leur
 * backend sandbox).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps invalide." }, { status: 400 });
  }

  console.log("[orange-sms webhook] deliveryInfoNotification:", JSON.stringify(body));

  return NextResponse.json({ ok: true });
}
