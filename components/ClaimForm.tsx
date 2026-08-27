"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CLAIM_CATEGORIES, MESSAGE_MAX, MESSAGE_MIN } from "@/lib/claims";

type Props = {
  /** Email de la session, s'il y en a une : le champ devient alors inutile. */
  emailConnecte: string | null;
};

export default function ClaimForm({ emailConnecte }: Props) {
  const t = useTranslations("Claims");

  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [categorie, setCategorie] = useState<string>("paiement");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  // Champ leurre : voir /api/claims. Jamais rempli par un humain.
  const [website, setWebsite] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (message.trim().length < MESSAGE_MIN) {
      setErreur(t("errorTooShort", { min: MESSAGE_MIN }));
      return;
    }

    setEnvoi(true);
    try {
      const r = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailConnecte ?? email,
          name: nom,
          category: categorie,
          reference,
          message,
          website,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || t("errorGeneric"));
      setTicket(d.ticket ?? "—");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : String(err));
    } finally {
      setEnvoi(false);
    }
  };

  const champ =
    "w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 outline-none transition";
  const etiquette = "block text-xs font-semibold text-zinc-300 mb-1.5";

  // Une fois déposée, le formulaire cède la place à l'accusé de réception :
  // laisser les champs remplis inviterait à renvoyer la même réclamation.
  if (ticket) {
    return (
      <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-emerald-500/30 text-center">
        <p className="text-2xl mb-2" aria-hidden="true">
          ✓
        </p>
        <h2 className="font-bold text-emerald-300 mb-2">{t("sentTitle")}</h2>
        <p className="text-emerald-200/80 text-sm leading-relaxed mb-4">{t("sentBody")}</p>
        <p className="text-xs text-emerald-200/60 mb-1">{t("ticketLabel")}</p>
        <p className="font-mono text-lg font-bold text-emerald-300 tracking-widest">{ticket}</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="space-y-4 bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 sm:p-8"
    >
      {erreur && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {erreur}
        </div>
      )}

      {/* Piège à robots : hors de l'écran plutôt que display:none, que certains
          remplisseurs automatiques savent ignorer. aria-hidden et tabIndex le
          retirent du parcours clavier et des lecteurs d'écran. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {emailConnecte ? (
        <p className="text-xs text-zinc-400">
          {t("signedInAs")} <span className="text-zinc-200 font-semibold">{emailConnecte}</span>
        </p>
      ) : (
        <div>
          <label htmlFor="claim-email" className={etiquette}>
            {t("emailLabel")}
          </label>
          <input
            id="claim-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={champ}
          />
          <p className="mt-1.5 text-[11px] text-zinc-500">{t("emailHint")}</p>
        </div>
      )}

      <div>
        <label htmlFor="claim-name" className={etiquette}>
          {t("nameLabel")}
        </label>
        <input
          id="claim-name"
          type="text"
          autoComplete="name"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder={t("namePlaceholder")}
          className={champ}
        />
      </div>

      <div>
        <label htmlFor="claim-category" className={etiquette}>
          {t("categoryLabel")}
        </label>
        <select
          id="claim-category"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className={`${champ} cursor-pointer`}
        >
          {CLAIM_CATEGORIES.map((c) => (
            <option key={c} value={c} className="bg-zinc-900 text-white">
              {t(`category_${c}`)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="claim-reference" className={etiquette}>
          {t("referenceLabel")}
        </label>
        <input
          id="claim-reference"
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder={t("referencePlaceholder")}
          className={champ}
        />
        <p className="mt-1.5 text-[11px] text-zinc-500">{t("referenceHint")}</p>
      </div>

      <div>
        <label htmlFor="claim-message" className={etiquette}>
          {t("messageLabel")}
        </label>
        <textarea
          id="claim-message"
          required
          rows={6}
          maxLength={MESSAGE_MAX}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("messagePlaceholder")}
          className={`${champ} resize-y`}
        />
        <p className="mt-1.5 text-[11px] text-zinc-500 text-right">
          {message.length} / {MESSAGE_MAX}
        </p>
      </div>

      <button
        type="submit"
        disabled={envoi}
        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/30 text-base"
      >
        {envoi ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
