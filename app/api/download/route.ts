// Extrayez votre paramètre audioUrl de la requête
const { searchParams } = new URL(request.url);
const audioUrl = searchParams.get("url");

// Vérifiez que la variable n'est ni nulle ni vide
if (!audioUrl) {
  return new Response("URL manquante", { status: 400 });
}

// Désormais, TypeScript sait que 'audioUrl' est une string valide
const response = await fetch(audioUrl);