"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const GENRES = [
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
  "Pop",
  "Hip-Hop / Rap",
  "R&B",
  "Synthwave / Electro",
  "Rock",
  "Zouk",
  "Reggae / Dancehall",
];

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 75; // 75 x 4s = 300s

interface SongResult {
  songId: string;
  audioUrl: string;
  title?: string;
  lyrics?: string;
}

export default function StudioPage() {
  const t = useTranslations("Studio");

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState("Afrobeats");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [song, setSong] = useState<SongResult | null>(null);

  const pollStatus = async (taskId: string, songId: string) => {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      setStatusText(`${t("generating")} (${attempt * (POLL_INTERVAL_MS / 1000)}s)`);

      const res = await fetch(
        `/api/generate/status?taskId=${encodeURIComponent(taskId)}&songId=${encodeURIComponent(songId)}`
      );
      const data = await res.json();

      if (data.status === "SUCCESS" && data.song?.audioUrl) {
        setSong({ songId, ...data.song });
        setLoading(false);
        return;
      }
      if (data.status === "FAILED") {
        throw new Error(data.error || t("genericError"));
      }
    }

    throw new Error(t("timeout"));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setSong(null);
    setStatusText(t("generating"));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, genre, title }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }

      await pollStatus(data.taskId, data.songId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col justify-center">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-zinc-400 text-sm">{t("subtitle")}</p>
      </div>

      {error && (
        <div className="w-full mb-6 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-6 bg-zinc-900/90 p-6 sm:p-8 rounded-2xl border-2 border-zinc-800 shadow-2xl"
      >
        <div>
          <label htmlFor="prompt" className="block text-sm font-semibold text-zinc-200 mb-2">
            {t("promptLabel")} <span className="text-indigo-400">*</span>
          </label>
          <textarea
            id="prompt"
            required
            rows={4}
            maxLength={2000}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t("promptPlaceholder")}
            className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 outline-none transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-zinc-200 mb-2">
              {t("titleLabel")}
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("titlePlaceholder")}
              className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 outline-none transition"
            />
          </div>

          <div>
            <label htmlFor="genre" className="block text-sm font-semibold text-zinc-200 mb-2">
              {t("genreLabel")}
            </label>
            <select
              id="genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
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
              <span className="animate-spin">⏳</span> {statusText}
            </>
          ) : (
            t("submit")
          )}
        </button>
      </form>

      {song && (
        <div className="w-full mt-8 p-6 bg-zinc-900 rounded-2xl border-2 border-indigo-500/40 shadow-xl">
          <h2 className="text-lg font-bold mb-1 text-indigo-400">{t("successTitle")}</h2>
          {song.title && <p className="text-sm font-semibold text-zinc-200 mb-4">{song.title}</p>}

          <audio controls src={song.audioUrl} className="w-full rounded-lg mb-6" />

          {song.lyrics && (
            <div className="bg-zinc-950 p-4 rounded-lg mb-6 border border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">{t("lyricsTitle")}</h3>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                {song.lyrics}
              </pre>
            </div>
          )}

          <a
            href={`/api/download?songId=${encodeURIComponent(song.songId)}`}
            className="inline-block w-full sm:w-auto text-center bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition"
          >
            {t("download")}
          </a>
        </div>
      )}
    </div>
  );
}
