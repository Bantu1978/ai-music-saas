import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const audioUrl = searchParams.get("url");

  // Validation du paramètre URL
  if (!audioUrl) {
    return new NextResponse("URL manquante", { status: 400 });
  }

  try {
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      return new NextResponse("Échec du téléchargement de l'audio", { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'attachment; filename="bakumelo-track.mp3"',
      },
    });
  } catch (error) {
    return new NextResponse("Erreur serveur lors de la récupération du fichier", { status: 500 });
  }
}