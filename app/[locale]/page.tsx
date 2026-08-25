"use client";

import { useState } from "react";
import Header from "@/components/Header";

export default function HomePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      // 1. Appel vers l'API de génération
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, genre: style, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération");
      }

      // 2. Polling pour récupérer le résultat (taskId)
      if (data.taskId && data.songId) {
        pollStatus(data.taskId, data.songId);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const pollStatus = (taskId: string, songId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/custom_generate?taskId=${taskId}&songId=${songId}`);
        const statusData = await res.json();

        if (statusData.status === "SUCCESS" || statusData.status === "complete") {
          clearInterval(interval);
          setAudioUrl(statusData.data?.audio_url || statusData.audio_url);
          setLoading(false);
        } else if (statusData.status === "FAILED") {
          clearInterval(interval);
          setError("La génération de la chanson a échoué.");
          setLoading(false);
        }
      } catch (e) {
        clearInterval(interval);
        setError("Erreur lors de la vérification du statut.");
        setLoading(false);
      }
    }, 5000); // Vérification toutes les 5 secondes
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 flex flex-col items-center justify-center">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Créez votre musique avec <span className="text-indigo-500">BAKUMELO</span>
          </h1>
          <p className="mt-3 text-zinc-400">
            Saisissez votre texte, choisissez un style et laissez l'IA composer votre morceau.
          </p>
        </div>

        {error && (
          <div className="w-full mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="w-full space-y-4 bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Description / Paroles (Prompt)</label>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Une chanson pop dynamique sur les voyages spatiaux..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Titre de la chanson</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Vers les étoiles"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Style musical / Genre</label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="Ex: Synthwave, Pop, Afrobeats"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Composition en cours...
              </>
            ) : (
              "Générer la musique (1 crédit)"
            )}
          </button>
        </form>

        {/* Lecteur Audio une fois le morceau prêt */}
        {audioUrl && (
          <div className="w-full mt-8 p-6 bg-zinc-900 rounded-2xl border border-indigo-500/30 text-center">
            <h3 className="text-lg font-semibold mb-3 text-indigo-400">🎵 Votre morceau est prêt !</h3>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}
      </main>
    </div>
  );
}