"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface SongResult {
  id: string;
  prompt?: string;
  audioUrl: string;
  lyrics?: string;
  title?: string;
}

export default function CreatePage() {
  const t = useTranslations("CreatePage");

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedSong, setGeneratedSong] = useState<SongResult | null>(null);

  // Polling côté client pour vérifier l'état de la génération
  const pollStatus = async (taskId: string, fullPrompt: string) => {
    let completed = false;
    let attempts = 0;
    const maxAttempts = 60; // 60 x 4s = 240s max

    while (!completed && attempts < maxAttempts) {
      await new Promise((res) => setTimeout(res, 4000));
      attempts++;
      setStatusText(`${t("generating")} (${attempts * 4}s)`);

      try {
        const res = await fetch(`/api/generate/status?taskId=${taskId}`);
        const data = await res.json();

        if (data.status === "SUCCESS" && data.song) {
          setGeneratedSong({ ...data.song, prompt: fullPrompt });
          completed = true;
          setLoading(false);
        } else if (data.status === "FAILED") {
          throw new Error(data.error || "Generation failed.");
        }
      } catch (err: any) {
        if (attempts >= maxAttempts) {
          throw err;
        }
      }
    }

    if (!completed) {
      throw new Error("Time out. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setGeneratedSong(null);
    setStatusText(t("generating"));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, genre }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error (${res.status})`);
      }

      await pollStatus(data.taskId, data.prompt);
    } catch (err: any) {
      setError(err.message || "An error occurred during generation.");
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedSong?.audioUrl) return;
    window.location.href = `/api/download?url=${encodeURIComponent(generatedSong.audioUrl)}`;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-slate-100">
      <h1 className="text-3xl font-bold mb-2">{t("title")}</h1>
      <p className="text-slate-400 mb-8">{t("subtitle")}</p>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-8">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-slate-300">
            {t("genreLabel")}
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="Afrobeats">Afrobeats</option>
            <option value="Amapiano">Amapiano</option>
            <option value="Makossa">Makossa / Bikutsi</option>
            <option value="R&B">R&B</option>
            <option value="Hip-Hop">Hip-Hop / Trap</option>
            <option value="Pop">Pop</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-slate-300">
            {t("promptLabel")}
          </label>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("promptPlaceholder")}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-950 text-white font-semibold py-3 px-6 rounded-lg transition"
        >
          {loading ? statusText : t("submitBtn")}
        </button>
      </form>

      {generatedSong && (
        <div className="bg-slate-900 border border-indigo-500/40 p-6 rounded-xl">
          <h2 className="text-xl font-bold mb-1 text-indigo-400">{generatedSong.title}</h2>
          <p className="text-xs text-slate-400 mb-4">Style : {generatedSong.prompt}</p>

          <audio controls src={generatedSong.audioUrl} className="w-full mb-6" />

          {generatedSong.lyrics && (
            <div className="bg-slate-950 p-4 rounded-lg mb-6 border border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300 mb-2">{t("lyricsTitle")}</h3>
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {generatedSong.lyrics}
              </pre>
            </div>
          )}

          <button
            onClick={handleDownload}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            {t("downloadBtn")}
          </button>
        </div>
      )}
    </div>
  );
}