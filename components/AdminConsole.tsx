"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  credits: number;
};

type Song = {
  id: string;
  title: string | null;
  genre: string | null;
  status: string | null;
  audio_url: string | null;
};

export default function AdminConsole() {
  const t = useTranslations("Admin");

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      setProfiles(data.profiles ?? []);
      setSongs(data.songs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAddCredits = async (userId: string) => {
    const raw = window.prompt(t("addCreditsPrompt"), "5");
    if (!raw) return;

    const amount = Number.parseInt(raw, 10);
    if (!Number.isInteger(amount) || amount === 0) return;

    const res = await fetch("/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Error ${res.status}`);
      return;
    }
    fetchData();
  };

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-10">
      <h1 className="text-3xl font-extrabold mb-8">{t("title")}</h1>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400">{t("loading")}</p>
      ) : (
        <div className="space-y-10">
          <section className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-indigo-400">{t("usersSection")}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-800 text-zinc-400">
                  <tr>
                    <th className="py-3 px-2">{t("colUser")}</th>
                    <th className="py-3 px-2">{t("colCredits")}</th>
                    <th className="py-3 px-2">{t("colAction")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {profiles.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-2">{p.email || p.full_name || p.id.slice(0, 8)}</td>
                      <td className="py-3 px-2 font-bold text-indigo-300">{p.credits}</td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleAddCredits(p.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1.5 rounded-lg font-bold"
                        >
                          {t("addCredits")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-purple-400">{t("songsSection")}</h2>
            <div className="space-y-3">
              {songs.map((song) => (
                <div
                  key={song.id}
                  className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{song.title}</h3>
                    <p className="text-xs text-zinc-400">
                      {song.genre} • {song.status}
                    </p>
                  </div>
                  {song.audio_url && (
                    <audio controls src={song.audio_url} className="h-8 w-48 sm:w-64 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
