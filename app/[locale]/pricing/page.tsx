"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/**
 * La ligne de confirmation nomme la devise, obtenue via Intl.
 *
 * Les huit pays de la zone franc partagent le même prix, au même taux : passer
 * du Cameroun au Sénégal ne change rien à l'affichage des montants, ce qui
 * donnait l'impression d'un sélecteur figé. Nommer la devise rend ce partage
 * explicite au lieu de le laisser deviner.
 */
const COUNTRIES = [
  // Zone Franc CFA (XAF / XOF)
  { code: "CM", name: "Cameroun", currency: "XAF", rate: 1, symbol: "FCFA" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", rate: 1, symbol: "FCFA" },
  { code: "SN", name: "Sénégal", currency: "XOF", rate: 1, symbol: "FCFA" },
  { code: "GA", name: "Gabon", currency: "XAF", rate: 1, symbol: "FCFA" },
  { code: "CG", name: "Congo-Brazzaville", currency: "XAF", rate: 1, symbol: "FCFA" },
  { code: "CD", name: "RDC (Congo)", currency: "USD", rate: 0.0016, symbol: "$" },
  { code: "TG", name: "Togo", currency: "XOF", rate: 1, symbol: "FCFA" },
  { code: "BJ", name: "Bénin", currency: "XOF", rate: 1, symbol: "FCFA" },
  { code: "BF", name: "Burkina Faso", currency: "XOF", rate: 1, symbol: "FCFA" },
  // Autres pays Africains
  { code: "NG", name: "Nigéria", currency: "NGN", rate: 2.5, symbol: "NGN" },
  { code: "GH", name: "Ghana", currency: "GHS", rate: 0.025, symbol: "GHS" },
  { code: "KE", name: "Kenya", currency: "KES", rate: 0.21, symbol: "KES" },
  { code: "MA", name: "Maroc", currency: "MAD", rate: 0.016, symbol: "DH" },
  // Europe & International
  { code: "FR", name: "France / Europe", currency: "EUR", rate: 0.0015, symbol: "€" },
  { code: "US", name: "États-Unis / Canada", currency: "USD", rate: 0.0016, symbol: "$" },
];

const PACKS = [
  { credits: 3, baseFcfa: 2990, labelKey: "packDiscovery", popular: false },
  { credits: 10, baseFcfa: 8900, labelKey: "packCreator", popular: true },
  { credits: 25, baseFcfa: 19900, labelKey: "packPro", popular: false },
] as const;

export default function PricingPage() {
  const t = useTranslations("Pricing");
  const locale = useLocale();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);

  // Nom de devise localisé, plutôt qu'une table maison à tenir à jour. Intl
  // distingue en outre XAF (BEAC) de XOF (BCEAO) : deux pays de la zone franc
  // deviennent réellement différenciables, alors que « franc CFA » seul les
  // aurait laissés identiques. Repli sur le code ISO si l'API manque.
  const currencyNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([locale], { type: "currency" });
    } catch {
      return null;
    }
  }, [locale]);

  const currencyLabel = (code: string) => currencyNames?.of(code) ?? code;

  const formatPrice = (baseFcfa: number) => {
    const converted = baseFcfa * selectedCountry.rate;
    if (selectedCountry.symbol === "FCFA") {
      return `${converted.toLocaleString("fr-FR")} FCFA`;
    }
    return `${converted.toFixed(2)} ${selectedCountry.symbol}`;
  };

  return (
    <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-5xl font-extrabold">{t("title")}</h1>
        <p className="mt-2 text-zinc-400 text-sm sm:text-base">{t("subtitle")}</p>
      </div>

      <div className="max-w-xs mx-auto mb-10 text-center">
        <label
          htmlFor="country"
          className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider"
        >
          {t("countryLabel")}
        </label>
        <select
          id="country"
          value={selectedCountry.code}
          onChange={(e) =>
            setSelectedCountry(
              COUNTRIES.find((c) => c.code === e.target.value) || COUNTRIES[0]
            )
          }
          className="w-full bg-zinc-900 border-2 border-zinc-700 rounded-xl px-4 py-3 text-sm text-white font-bold outline-none focus:border-indigo-500 cursor-pointer"
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name} ({country.symbol})
            </option>
          ))}
        </select>

        {/* Confirmation du choix. Le nom du pays y figure toujours : c'est ce
            qui garantit un changement visible à chaque sélection, y compris
            entre deux pays de la zone franc où les montants sont identiques.
            aria-live pour que la substitution soit aussi annoncée à voix haute. */}
        <p aria-live="polite" className="mt-3 text-xs text-zinc-400">
          {t("displayedFor", {
            country: selectedCountry.name,
            currency: currencyLabel(selectedCountry.currency),
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PACKS.map((pack) => (
          <div
            key={pack.labelKey}
            className={`rounded-2xl bg-zinc-900 p-8 border-2 flex flex-col justify-between relative ${
              pack.popular ? "border-indigo-500 shadow-xl shadow-indigo-600/20" : "border-zinc-800"
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full">
                {t("recommended")}
              </span>
            )}

            <div>
              <h2 className="text-xl font-bold">{t(pack.labelKey)}</h2>
              <div className="my-6">
                <span className="text-3xl sm:text-4xl font-black">
                  {formatPrice(pack.baseFcfa)}
                </span>
              </div>
              <div className="border-t border-zinc-800 pt-4 text-base font-bold text-indigo-400 mb-6">
                🎵 {pack.credits} {t("creditsSuffix")}
              </div>
            </div>

            <button className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/25">
              {t("buy")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
