"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import {
  GENRES,
  LANGUAGES,
  VOICES,
  DEFAULT_GENRE,
  DEFAULT_LANGUAGE,
  DEFAULT_VOICE,
} from "@/lib/musicOptions";

const POLL_INTERVAL_MS = 4000;
const MAX_ATTEMPTS = 75; // 75 x 4s = 300s

interface SongResult {
  songId: string;
  audioUrl: string;
  title?: string;
  lyrics?: string;
}

export default function StudioForm({
  initialCredits,
  // Vrai pour un administrateur : le solde n'est ni décompté ni bloquant.
  unlimited = false,
}: {
  initialCredits: number;
  unlimited?: boolean;
}) {
  const t = useTranslations("Studio");
  const [credits, setCredits] = useState(initialCredits);

  const [prompt, setPrompt] = useState("");
  const [genre, setGenre] = useState<string>(DEFAULT_GENRE);
  const [voice, setVoice] = useState<string>(DEFAULT_VOICE);
  const [language, setLanguage] = useState<string>(DEFAULT_LANGUAGE);
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
        body: JSON.stringify({ prompt, genre, title, voice, language }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
      }

      if (typeof data.creditsRemaining === "number") {
        setCredits(data.creditsRemaining);
      }

      await pollStatus(data.taskId, data.songId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col justify-center">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-extrabold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-zinc-400 text-sm">{t("subtitle")}</p>
        </div>
        <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-black px-3 py-1.5 rounded-full whitespace-nowrap">
          🎵 {unlimited ? t("creditsUnlimited") : t("creditsLeft", { count: credits })}
        </span>
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
              {/* Les styles non documentés par Suno sont signalés : le résultat
                  y est moins prévisible, et un client doit le savoir avant de
                  dépenser son crédit. */}
              {GENRES.map((g) => (
                <option key={g.id} value={g.id} className="bg-zinc-900 text-white">
                  {g.experimental ? `${g.label} — ${t("experimental")}` : g.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label htmlFor="voice" className="block text-sm font-semibold text-zinc-200 mb-2">
              {t("voiceLabel")}
            </label>
            <select
              id="voice"
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white outline-none transition cursor-pointer"
            >
              {VOICES.map((v) => (
                <option key={v} value={v} className="bg-zinc-900 text-white">
                  {t(`voice_${v}`)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-semibold text-zinc-200 mb-2">
              {t("languageLabel")}
            </label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white outline-none transition cursor-pointer"
            >
              {/* « auto » est le seul intitulé traduit : les autres sont des noms
                  de langue, identiques dans les deux interfaces. */}
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id} className="bg-zinc-900 text-white">
                  {l.id === "auto" ? t("languageAuto") : l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (!unlimited && credits < 1)}
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

      {/* Pendant la génération, le seul retour visuel était le compteur logé
          dans le bouton. Cinq minutes d'attente sans explication invitent à
          recharger la page — ce qui perd le suivi de la tâche. Ce panneau dit
          la durée attendue et où le morceau apparaîtra. */}
      {loading && (
        <div
          role="status"
          aria-live="polite"
          className="w-full mt-6 p-5 rounded-2xl bg-indigo-500/10 border-2 border-indigo-500/30"
        >
          <p className="font-bold text-indigo-300 mb-1 flex items-center gap-2">
            <span className="animate-spin inline-block">⏳</span>
            {t("waitTitle")}
          </p>
          <p className="text-indigo-200/80 text-sm leading-relaxed">{t("waitBody")}</p>
          {statusText && <p className="mt-3 text-xs text-indigo-300/60">{statusText}</p>}
        </div>
      )}

      {!unlimited && credits < 1 && !loading && (
        <div className="w-full mt-6 p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 text-center">
          <p className="font-bold text-amber-300 mb-1">{t("noCreditsTitle")}</p>
          <p className="text-amber-200/80 text-sm mb-4">{t("noCreditsBody")}</p>
          <Link
            href="/pricing"
            className="inline-block px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl transition"
          >
            {t("buyCredits")}
          </Link>
        </div>
      )}

      {song && (
        <div className="w-full mt-8 p-6 bg-zinc-900 rounded-2xl border-2 border-indigo-500/40 shadow-xl">
          <h2 className="text-lg font-bold mb-1 text-indigo-400">{t("successTitle")}</h2>
          {song.title && <p className="text-sm font-semibold text-zinc-200 mb-4">{song.title}</p>}

          <audio controls src={song.audioUrl} className="w-full rounded-lg mb-6" />

          {/* Le téléchargement passe avant les paroles : c'est ce que le client
              vient chercher, et des paroles longues le repoussaient sous la
              ligne de flottaison, où il fallait le deviner. */}
          <a
            href={`/api/download?songId=${encodeURIComponent(song.songId)}`}
            className="flex w-full items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-6 py-4 rounded-xl transition shadow-lg shadow-green-600/30 text-base"
          >
            <span aria-hidden="true">⬇</span>
            {t("download")}
          </a>

          {song.lyrics && (
            <div className="bg-zinc-950 p-4 rounded-lg mt-6 border border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-300 mb-2">{t("lyricsTitle")}</h3>
              <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">
                {song.lyrics}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
