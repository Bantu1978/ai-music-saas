"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CLAIM_STATUSES, type Claim, type ClaimStatus } from "@/lib/claims";

/**
 * Boîte de réception des réclamations.
 *
 * Composant autonome, avec sa propre route et sa propre pagination : la console
 * principale charge déjà six jeux de données dans un seul état, et y greffer
 * celui-ci l'aurait rendue plus difficile à suivre pour rien. Les deux ne
 * partagent que leur emplacement à l'écran.
 */

const TEINTES: Record<ClaimStatus, string> = {
  ouverte: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  en_cours: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  resolue: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

type Reponse = {
  claims: Claim[];
  page: number;
  pages: number;
  total: number;
  compteurs: Record<string, number>;
};

/**
 * Chargement pur, sans état React, comme dans la console principale : l'effet
 * ne touche alors à l'état qu'après le `await`, sans déclencher de rendu en
 * cascade au montage.
 */
async function chargerClaims(page: number, statut: string, q: string): Promise<Reponse> {
  const p = new URLSearchParams({ page: String(page) });
  if (statut) p.set("status", statut);
  if (q) p.set("q", q);

  const r = await fetch(`/api/admin/claims?${p}`);
  const d = await r.json();
  if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
  return {
    claims: d.claims ?? [],
    page: d.page ?? 1,
    pages: d.pages ?? 1,
    total: d.total ?? 0,
    compteurs: d.compteurs ?? {},
  };
}

export default function AdminClaims() {
  const t = useTranslations("Admin");
  const locale = useLocale();

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(
      new Date(iso)
    );

  const [claims, setClaims] = useState<Claim[]>([]);
  const [compteurs, setCompteurs] = useState<Record<string, number>>({});
  const [filtre, setFiltre] = useState<ClaimStatus | "">("");
  const [recherche, setRecherche] = useState("");
  const [saisie, setSaisie] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  // Réclamation dont une écriture est en cours : n'immobilise que sa ligne.
  const [occupe, setOccupe] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [enregistre, setEnregistre] = useState<string | null>(null);

  useEffect(() => {
    // Garde d'annulation : une recherche rapidement corrigée lance deux
    // requêtes, et sans cela la plus lente écraserait la plus récente.
    let annule = false;

    chargerClaims(page, filtre, recherche)
      .then((d) => {
        if (annule) return;
        setClaims(d.claims);
        setPages(d.pages);
        setTotal(d.total);
        setCompteurs(d.compteurs);
        // Les notes suivent les données rechargées, sinon une note modifiée
        // ailleurs resterait affichée dans son ancien état.
        setNotes(Object.fromEntries(d.claims.map((c) => [c.id, c.admin_note ?? ""])));
        setErreur(null);
        setChargement(false);
      })
      .catch((e: unknown) => {
        if (annule) return;
        setErreur(e instanceof Error ? e.message : String(e));
        setChargement(false);
      });

    return () => {
      annule = true;
    };
  }, [page, filtre, recherche]);

  const modifier = async (id: string, champs: Partial<Pick<Claim, "status" | "admin_note">>) => {
    setOccupe(id);
    try {
      const r = await fetch("/api/admin/claims", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...champs }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `Erreur ${r.status}`);
      setClaims((liste) => liste.map((c) => (c.id === id ? d.claim : c)));
      setCompteurs((prev) => {
        // Recomptage local : évite un aller-retour complet pour un seul
        // changement de statut.
        const avant = claims.find((c) => c.id === id)?.status;
        if (!champs.status || !avant || avant === champs.status) return prev;
        return {
          ...prev,
          [avant]: Math.max(0, (prev[avant] ?? 0) - 1),
          [champs.status]: (prev[champs.status] ?? 0) + 1,
        };
      });
      setEnregistre(id);
      setTimeout(() => setEnregistre((v) => (v === id ? null : v)), 2000);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(null);
    }
  };

  const chercher = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setRecherche(saisie.trim());
  };

  const pastille = (s: ClaimStatus) =>
    `px-2.5 py-1 rounded-lg border text-[11px] font-bold ${TEINTES[s]}`;

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-amber-400">{t("claimsSection")}</h2>
        <span className="text-xs text-zinc-500">{t("claimsTotal", { count: total })}</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{t("claimsHint")}</p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setFiltre("");
            setPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            filtre === "" ? "bg-indigo-600 text-white" : "bg-zinc-950 text-zinc-400 hover:text-white"
          }`}
        >
          {t("claimsFilterAll")}
        </button>
        {CLAIM_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setFiltre(s);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filtre === s ? "bg-indigo-600 text-white" : "bg-zinc-950 text-zinc-400 hover:text-white"
            }`}
          >
            {t(`claimStatus_${s}`)} ({compteurs[s] ?? 0})
          </button>
        ))}
      </div>

      <form onSubmit={chercher} className="flex gap-2">
        <input
          type="search"
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder={t("claimsSearchPlaceholder")}
          aria-label={t("claimsSearchPlaceholder")}
          className="flex-1 bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none transition"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-semibold transition"
        >
          🔍
        </button>
      </form>

      {erreur && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {erreur}
        </div>
      )}

      {chargement ? (
        <p className="text-zinc-500 text-sm py-6 text-center">{t("loading")}</p>
      ) : claims.length === 0 ? (
        <div className="border border-dashed border-zinc-800 rounded-lg p-10 text-center text-zinc-500 text-sm">
          {t("claimsEmpty")}
        </div>
      ) : (
        <ul className="space-y-3">
          {claims.map((c) => (
            <li key={c.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-sm break-all">
                    {c.name || c.email}
                    <span className="ml-2 font-mono text-[11px] text-zinc-500">
                      #{c.id.slice(0, 8).toUpperCase()}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-400 break-all">
                    {c.email}
                    {!c.user_id && <span className="ml-2 text-zinc-600">· {t("claimVisitor")}</span>}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {t(`claimCategory_${c.category}`)} · {formatDate(c.created_at)}
                  </p>
                </div>
                <span className={pastille(c.status)}>{t(`claimStatus_${c.status}`)}</span>
              </div>

              {c.reference && (
                <p className="text-xs text-zinc-400">
                  <span className="text-zinc-500">{t("claimRefLabel")} :</span>{" "}
                  <span className="font-mono break-all">{c.reference}</span>
                </p>
              )}

              <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed bg-zinc-900 rounded-lg p-3 border border-zinc-800">
                {c.message}
              </p>

              <div className="flex flex-wrap gap-2">
                {CLAIM_STATUSES.filter((s) => s !== c.status).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={occupe === c.id}
                    onClick={() => modifier(c.id, { status: s })}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
                  >
                    → {t(`claimStatus_${s}`)}
                  </button>
                ))}
              </div>

              <div>
                <label
                  htmlFor={`note-${c.id}`}
                  className="block text-[11px] font-semibold text-zinc-400 mb-1"
                >
                  {t("claimNoteLabel")}
                </label>
                <textarea
                  id={`note-${c.id}`}
                  rows={2}
                  value={notes[c.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                  placeholder={t("claimNotePlaceholder")}
                  className="w-full bg-zinc-900 border border-zinc-700 focus:border-indigo-500 rounded-lg p-2 text-xs text-white placeholder-zinc-600 outline-none transition resize-y"
                />
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    disabled={occupe === c.id || (notes[c.id] ?? "") === (c.admin_note ?? "")}
                    onClick={() => modifier(c.id, { admin_note: notes[c.id] ?? "" })}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
                  >
                    {t("claimNoteSave")}
                  </button>
                  {enregistre === c.id && (
                    <span className="text-xs text-emerald-400 font-semibold">✓ {t("claimSaved")}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
          >
            {t("pagePrevious")}
          </button>
          <span className="text-xs text-zinc-500">{t("pageStatus", { page, pages })}</span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition"
          >
            {t("pageNext")}
          </button>
        </div>
      )}
    </section>
  );
}
