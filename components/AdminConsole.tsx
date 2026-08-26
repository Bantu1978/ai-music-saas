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

/** Paiement ouvert et jamais dénoué. */
type PendingPayment = {
  reference: string;
  pack: string;
  credits: number;
  amount: number;
  currency: string;
  createdAt: string;
  /** Une référence fournisseur existe : Notch Pay peut être interrogé. */
  checkable: boolean;
  user: string | null;
};

/** Génération restée en attente, jamais réconciliée. */
type StuckSong = {
  id: string;
  title: string | null;
  genre: string | null;
  createdAt: string;
  /** Une référence de tâche existe : Suno peut encore être interrogé. */
  recoverable: boolean;
  user: string | null;
};

/** Un réglage attendu par le serveur, et son état réel. */
type ConfigEntree = {
  id: string;
  intitule: string;
  requis: boolean;
  statut: "ok" | "manquant" | "attention";
  source: string | null;
  noms: string[];
  note: string | null;
};

type AdminData = {
  profiles: Profile[];
  /** Total hors pagination, pour calculer le nombre de pages. */
  total: number;
  /** Décidée par l'API : le client ne la duplique pas. */
  pageSize: number;
  /** Page réellement servie : l'API borne une demande hors limites. */
  page: number;
  songs: Song[];
  transactions: Transaction[];
  stuckSongs: StuckSong[];
  pendingPayments: PendingPayment[];
  config: ConfigEntree[];
};

/**
 * Chargement pur, sans état React : le composant décide seul quoi en faire.
 * C'est ce qui permet à l'effet de montage de ne mettre à jour l'état
 * qu'après le `await`, sans rendu en cascade.
 */
async function loadAdminData(query: string, page: number): Promise<AdminData> {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);

  const res = await fetch(`/api/admin/users?${params}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return {
    profiles: data.profiles ?? [],
    total: data.total ?? 0,
    pageSize: data.pageSize || 20,
    page: data.page || 1,
    songs: data.songs ?? [],
    transactions: data.transactions ?? [],
    stuckSongs: data.stuckSongs ?? [],
    pendingPayments: data.pendingPayments ?? [],
    config: data.config ?? [],
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
  const [stuckSongs, setStuckSongs] = useState<StuckSong[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [config, setConfig] = useState<ConfigEntree[]>([]);
  // Identifiant de la génération en cours de traitement, pour n'immobiliser que
  // sa propre ligne plutôt que tout le panneau.
  const [resolving, setResolving] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // `search` suit la frappe ; `query` ne bouge qu'après une pause, pour ne pas
  // interroger le serveur à chaque caractère.
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Incrémenté pour forcer un rechargement à paramètres constants, après un
  // ajustement de crédits : une seule voie d'accès aux données, pas deux.
  const [reloadToken, setReloadToken] = useState(0);

  // `busy` est toujours armé depuis un gestionnaire d'événement, jamais depuis
  // un effet : c'est ce qui évite les rendus en cascade que signale
  // react-hooks/set-state-in-effect.
  const [busy, setBusy] = useState(false);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const apply = (data: AdminData) => {
    setProfiles(data.profiles);
    setTotal(data.total);
    setPageSize(data.pageSize);
    // L'API a pu ramener une page hors bornes dans le domaine valide.
    setPage(data.page);
    setSongs(data.songs);
    setTransactions(data.transactions);
    setStuckSongs(data.stuckSongs);
    setPendingPayments(data.pendingPayments);
    setConfig(data.config);
    setError(null);
  };

  // Anti-rebond de la recherche. Le `setTimeout` place les écritures d'état hors
  // du corps de l'effet, donc hors du chemin synchrone.
  useEffect(() => {
    const id = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Chargement des données, rejoué à chaque changement de recherche ou de page.
  // `loading` vaut déjà true au montage : rien à écrire avant le `await`, l'état
  // n'est touché qu'une fois la réponse là.
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await loadAdminData(query, page);
        if (active) apply(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (active) {
          setLoading(false);
          setBusy(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [query, page, reloadToken]);

  const goToPage = (next: number) => {
    setBusy(true);
    setPage(next);
  };

  const handleSearch = (value: string) => {
    setBusy(true);
    setSearch(value);
  };

  const handleResolve = async (songId: string, action: "reconcile" | "refund") => {
    if (action === "refund" && !window.confirm(t("refundConfirm"))) return;

    setResolving(songId);
    try {
      const res = await fetch("/api/admin/songs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, action }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return;
      }

      // « still_pending » n'est pas une erreur : Suno n'a simplement pas encore
      // fini. Le dire explicitement évite de cliquer en boucle.
      if (data.outcome === "still_pending") {
        setError(t("stillPending"));
        return;
      }

      setBusy(true);
      setReloadToken((token) => token + 1);
    } finally {
      setResolving(null);
    }
  };

  const handleCheckPayment = async (reference: string) => {
    setResolving(reference);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`);
        return;
      }
      // « pending » n'est pas une erreur : Notch Pay n'a simplement pas encore
      // confirmé l'encaissement. Le dire évite de cliquer en boucle.
      if (data.denouement === "pending" || data.denouement === "unverified") {
        setError(t("paymentStillPending"));
        return;
      }

      setBusy(true);
      setReloadToken((token) => token + 1);
    } finally {
      setResolving(null);
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

    setBusy(true);
    setReloadToken((token) => token + 1);
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
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-bold text-indigo-400">{t("usersSection")}</h2>
              <p className="text-xs text-zinc-500">{t("totalUsers", { count: total })}</p>
            </div>

            <div className="mb-5">
              <label htmlFor="admin-search" className="sr-only">
                {t("searchLabel")}
              </label>
              <input
                id="admin-search"
                type="search"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full sm:max-w-sm bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition"
              />
            </div>

            {profiles.length === 0 ? (
              <p className="text-zinc-500 text-sm">{t("noResults")}</p>
            ) : (
            <div className={`overflow-x-auto transition-opacity ${busy ? "opacity-50" : ""}`}>
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
            )}

            {pageCount > 1 && (
              <div className="flex items-center justify-between gap-4 mt-5 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || busy}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 transition"
                >
                  ← {t("pagePrevious")}
                </button>

                <span className="text-xs text-zinc-400 font-semibold whitespace-nowrap">
                  {t("pageStatus", { page, pages: pageCount })}
                </span>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pageCount || busy}
                  className="text-xs font-bold px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 transition"
                >
                  {t("pageNext")} →
                </button>
              </div>
            )}
          </section>

          {config.length > 0 && (() => {
            const problemes = config.filter((c) => c.statut !== "ok");
            return (
              <section
                className={`bg-zinc-900 border-2 rounded-2xl p-6 ${
                  problemes.some((c) => c.statut === "manquant")
                    ? "border-red-500/40"
                    : problemes.length > 0
                      ? "border-amber-500/40"
                      : "border-zinc-800"
                }`}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                  <h2 className="text-xl font-bold text-sky-400">{t("configSection")}</h2>
                  <p className="text-xs text-zinc-500">
                    {problemes.length === 0
                      ? t("configAllGood")
                      : t("configProblems", { count: problemes.length })}
                  </p>
                </div>
                <p className="text-xs text-zinc-400 mb-5 max-w-2xl leading-relaxed">
                  {t("configHint")}
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 text-zinc-400">
                      <tr>
                        <th className="py-3 px-2">{t("configWhat")}</th>
                        <th className="py-3 px-2">{t("configState")}</th>
                        <th className="py-3 px-2">{t("configDetail")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {config.map((c) => (
                        <tr key={c.id}>
                          <td className="py-3 px-2">
                            <span className="font-semibold">{c.intitule}</span>
                            <span className="block text-[11px] text-zinc-500 font-mono">
                              {c.source ?? c.noms.join(" ou ")}
                            </span>
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span
                              className={`text-xs font-bold px-2 py-1 rounded-lg ${
                                c.statut === "manquant"
                                  ? "bg-red-500/15 text-red-400"
                                  : c.statut === "attention"
                                    ? "bg-amber-500/15 text-amber-400"
                                    : "bg-emerald-500/15 text-emerald-400"
                              }`}
                            >
                              {c.statut === "manquant"
                                ? t("configMissing")
                                : c.statut === "attention"
                                  ? t("configWarning")
                                  : t("configOk")}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-zinc-400 text-xs">
                            {c.note ?? (c.requis ? t("configMissingHelp") : "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })()}

          {pendingPayments.length > 0 && (
            <section className="bg-zinc-900 border-2 border-sky-500/40 rounded-2xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h2 className="text-xl font-bold text-sky-400">{t("pendingPaymentsSection")}</h2>
                <p className="text-xs text-zinc-500">
                  {t("pendingPaymentsCount", { count: pendingPayments.length })}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mb-5 max-w-2xl leading-relaxed">
                {t("pendingPaymentsHint")}
              </p>

              <div className="space-y-3">
                {pendingPayments.map((p) => (
                  <div
                    key={p.reference}
                    className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm">
                        {p.credits} {t("creditsWord")} — {p.amount.toLocaleString("fr-FR")} {p.currency}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {p.user || t("unknownUser")} • {formatDate(p.createdAt)}
                      </p>
                    </div>

                    <button
                      onClick={() => handleCheckPayment(p.reference)}
                      disabled={!p.checkable || resolving === p.reference}
                      title={p.checkable ? undefined : t("paymentNotOpened")}
                      className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-xs px-3 py-1.5 rounded-lg font-bold transition shrink-0"
                    >
                      {t("checkPayment")}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {stuckSongs.length > 0 && (
            <section className="bg-zinc-900 border-2 border-amber-500/40 rounded-2xl p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <h2 className="text-xl font-bold text-amber-400">{t("stuckSection")}</h2>
                <p className="text-xs text-zinc-500">
                  {t("stuckCount", { count: stuckSongs.length })}
                </p>
              </div>
              <p className="text-xs text-zinc-400 mb-5 max-w-2xl leading-relaxed">
                {t("stuckHint")}
              </p>

              <div className="space-y-3">
                {stuckSongs.map((song) => (
                  <div
                    key={song.id}
                    className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate">
                        {song.title || t("untitled")}
                      </h3>
                      <p className="text-xs text-zinc-400">
                        {song.user || t("unknownUser")} • {song.genre} •{" "}
                        {formatDate(song.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleResolve(song.id, "reconcile")}
                        disabled={!song.recoverable || resolving === song.id}
                        title={song.recoverable ? undefined : t("noTaskRef")}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs px-3 py-1.5 rounded-lg font-bold transition"
                      >
                        {t("reconcile")}
                      </button>
                      <button
                        onClick={() => handleResolve(song.id, "refund")}
                        disabled={resolving === song.id}
                        className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-xs px-3 py-1.5 rounded-lg font-bold transition"
                      >
                        {t("refund")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
