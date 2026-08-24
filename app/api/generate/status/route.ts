import { NextRequest, NextResponse } from "next/server";
import https from "https";

const agent = new https.Agent({ keepAlive: true });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId requis" }, { status: 400 });
    }

    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API manquante" }, { status: 500 });
    }

    const fetchRes = await fetch(
      `https://api.sunoapi.org/api/v1/generate/record-info?taskId=${taskId}`,
      {
        headers: { Authorization: `Bearer ${apiKey.trim()}` },
        // @ts-ignore
        agent,
      }
    );

    const rawText = await fetchRes.text();
    let fetchData: any;

    try {
      fetchData = JSON.parse(rawText);
    } catch (e) {
      return NextResponse.json({ status: "PENDING" });
    }

    const taskData = fetchData.data || {};
    const status = taskData.status;

    if (status === "SUCCESS" && taskData.response) {
      const sunoData = taskData.response.sunoData || taskData.response;
      const clipsArray = Array.isArray(sunoData) ? sunoData : Object.values(sunoData);

      if (clipsArray.length > 0) {
        const firstClip = clipsArray[0] as any;
        const audioUrl =
          firstClip?.audioUrl ||
          firstClip?.audio_url ||
          firstClip?.stream_url ||
          firstClip?.cdn_url;

        const lyrics =
          firstClip?.metadata?.prompt ||
          firstClip?.lyric ||
          firstClip?.prompt ||
          "Paroles générées";

        const title = firstClip?.title || "Chanson BAKUMELO";

        if (audioUrl) {
          return NextResponse.json({
            status: "SUCCESS",
            song: {
              id: taskId,
              audioUrl,
              lyrics,
              title,
            },
          });
        }
      }
    } else if (status === "FAILED" || status === "CREATE_TASK_FAILED") {
      return NextResponse.json({
        status: "FAILED",
        error: taskData.errorMessage || "La génération a échoué chez Suno.",
      });
    }

    // Statut toujours PENDING / PROCESSING
    return NextResponse.json({ status: status || "PENDING" });
  } catch (error: any) {
    return NextResponse.json({ status: "PENDING" });
  }
}