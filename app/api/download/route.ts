import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let audioUrl = searchParams.get('url');

  if (!audioUrl) {
    return NextResponse.json({ error: 'URL manquante' }, { status: 400 });
  }

  // Si l'URL arrive sous forme d'objet stringifié, extraction du lien direct
  try {
    if (audioUrl.startsWith('{') || audioUrl.startsWith('[')) {
      const parsed = JSON.parse(audioUrl);
      audioUrl = parsed.audioUrl || parsed.audio || parsed.url || audioUrl;
    }
  } catch (e) {
    // Si ce n'est pas du JSON, on conserve la string originale
  }

  try {
    const response = await fetch(audioUrl);
    
    if (!response.ok) {
      throw new Error(`Erreur HTTP lors de la récupération du fichier : ${response.status}`);
    }

    const blob = await response.blob();
    const headers = new Headers();
    
    headers.set('Content-Type', 'audio/mpeg');
    headers.set('Content-Disposition', 'attachment; filename="BAKUMELO_track.mp3"');

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}