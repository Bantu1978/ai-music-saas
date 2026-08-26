"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

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

/** Mouvement de crédits, déjà aplati par /api/admin/users. */
type Transaction = {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
  user: string | null;
};

type AdminData = { profiles: Profile[]; songs: Song[]; transactions: Transaction[] };

/**
 * Chargement pur, sans état React : le composant décide seul quoi en faire.
 * C'est ce qui permet à l'effet de montage de ne mettre à jour l'état
 * qu'après le `await`, sans rendu en cascade.
 */
async function loadAdminData(): Promise<AdminData> {
  const res = await fetch("/api/admin/users");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return {
    profiles: data.profiles ?? [],
    songs: data.songs ?? [],
    transactions: data.transactions ?? [],
  };
}

export default function AdminConsole() {
  const t = useTranslations("Admin");
  const locale = useLocale();

  // Intl plutôt que le formateur de next-intl : ce panneau est rendu après le
  // montage, jamais côté serveur, donc aucun risque d'écart d'hydratation — et
  // cela évite d'imposer un fuseau au reste de la configuration.
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso)
    );

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = (data: AdminData) => {
    setProfiles(data.profiles);
    setSongs(data.songs);
    setTransactions(data.transactions);
    setError(null);
  };

  // Chargement initial. `loading` vaut déjà true au montage, il n'y a donc rien
  // à écrire avant le `await` : l'état n'est touché qu'une fois la réponse là.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await loadAdminData();
        if (active) apply(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // Rechargement manuel, déclenché depuis un gestionnaire d'événement : ici le
  // spinner peut être armé immédiatement.
  const refresh = async () => {
    setLoading(true);
    try {
      apply(await loadAdminData());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

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

    refresh();
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
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 className="text-xl font-bold text-emerald-400">{t("transactionsSection")}</h2>
              <p className="text-xs text-zinc-500">{t("transactionsHint")}</p>
            </div>

            {transactions.length === 0 ? (
              <p className="text-zinc-500 text-sm">{t("transactionsEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="py-3 px-2 whitespace-nowrap">{t("colDate")}</th>
                      <th className="py-3 px-2">{t("colUser")}</th>
                      <th className="py-3 px-2 text-right whitespace-nowrap">{t("colAmount")}</th>
                      <th className="py-3 px-2">{t("colReason")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="py-3 px-2 text-zinc-400 whitespace-nowrap">
                          {formatDate(tx.createdAt)}
                        </td>
                        <td className="py-3 px-2">{tx.user || t("unknownUser")}</td>
                        <td
                          className={`py-3 px-2 text-right font-bold whitespace-nowrap ${
                            tx.amount < 0 ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                        </td>
                        <td className="py-3 px-2 text-zinc-400">{tx.description || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
