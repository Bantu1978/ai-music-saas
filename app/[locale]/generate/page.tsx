"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";

const GENRES = [
  // Styles Africains
  "Afrobeats",
  "Amapiano",
  "Makossa",
  "Coupé-Décalé",
  "Bikutsi",
  "Zouglou",
  "Highlife",
  "Rumba Congolaise",
  "Afro-Pop",
  "Gospel Africain",
  // Styles Internationaux
  "Pop",
  "Hip-Hop / Rap",
  "R&B",
  "Synthwave / Electro",
  "Rock",
  "Zouk",
  "Reggae / Dancehall",
];

export default function GeneratePage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("Afrobeats");
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
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, genre: style, title }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la génération");
      }

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
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col justify-center">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight">Studio de Création Musicale</h1>
          <p className="mt-1 text-zinc-400 text-sm">Les paroles seront composées automatiquement dans la langue de votre texte.</p>
        </div>

        {error && (
          <div className="w-full mb-6 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="w-full space-y-6 bg-zinc-900/90 p-6 sm:p-8 rounded-2xl border-2 border-zinc-800 shadow-2xl">
          <div>
            <label className="block text-sm font-semibold text-zinc-200 mb-2">
              Saisissez l'idée de votre chanson (dans la langue souhaitée) <span className="text-indigo-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Une chanson d'amour rythmée en Makossa célébrant un mariage..."
              className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">Titre du morceau</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Ndolo"
                className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-zinc-200 mb-2">Style Musical / Genre</label>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white outline-none transition cursor-pointer"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g} className="bg-zinc-900 text-white">
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> Composition en cours...
              </>
            ) : (
              "Générer le morceau (1 crédit)"
            )}
          </button>
        </form>

        {audioUrl && (
          <div className="w-full mt-8 p-6 bg-zinc-900 rounded-2xl border-2 border-indigo-500/40 text-center shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-indigo-400">🎉 Morceau généré avec succès !</h3>
            <audio controls src={audioUrl} className="w-full rounded-lg" />
          </div>
        )}
      </main>
    </div>
  );
}