import { NextRequest, NextResponse } from "next/server";
import https from "https";

const agent = new https.Agent({ keepAlive: true });

export async function POST(req: NextRequest) {
  try {
    const { prompt, genre } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Le sujet de la chanson est obligatoire." },
        { status: 400 }
      );
    }

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "La variable SUNO_API_KEY est manquante dans .env.local" },
        { status: 500 }
      );
    }

    const fullPrompt = genre ? `${genre}: ${prompt}` : prompt;

    // Démarrage de la tâche chez SunoAPI.org
    const createRes = await fetch("https://api.sunoapi.org/api/v1/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        customMode: false,
        instrumental: false,
        model: "V3_5",
        callBackUrl: "https://bakumelo.com/api/callback",
      }),
      // @ts-ignore
      agent,
    });

    const rawText = await createRes.text();
    let createData: any;

    try {
      createData = JSON.parse(rawText);
    } catch (e) {
      return NextResponse.json(
        { error: `Erreur serveur SunoAPI (${createRes.status})` },
        { status: 500 }
      );
    }

    if (!createRes.ok || (createData.code && createData.code !== 200 && createData.code !== 0)) {
      const errMsg = createData.msg || createData.message || createData.error || `Erreur API (${createRes.status})`;
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    const taskId = createData.data?.taskId || createData.data?.task_id || createData.taskId;

    if (!taskId) {
      return NextResponse.json(
        { error: "L'identifiant de tâche n'a pas été renvoyé." },
        { status: 500 }
      );
    }

    // Réponse instantanée avec le taskId
    return NextResponse.json({ taskId, prompt: fullPrompt });
  } catch (error: any) {
    console.error("Erreur serveur API:", error);
    return NextResponse.json(
      { error: error.message || "Une erreur interne s'est produite." },
      { status: 500 }
    );
  }
}