import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { topic, genre, mood } = await req.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un auteur-compositeur expert. Génère des paroles structurées (Couplet, Refrain) et un prompt descriptif pour un générateur de musique IA.',
        },
        {
          role: 'user',
          content: `Thème: ${topic}, Genre: ${genre}, Ambiance: ${mood}.`,
        },
      ],
    });

    const result = completion.choices[0].message.content;
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la génération du texte' }, { status: 500 });
  }
}