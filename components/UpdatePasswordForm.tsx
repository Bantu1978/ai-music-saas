"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export default function UpdatePasswordForm() {
  const t = useTranslations("ResetPassword");
  // Le routeur de next-intl préfixe lui-même la langue : plus besoin de la lire.
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("tooShort"));
      return;
    }
    if (password !== confirmation) {
      setError(t("mismatch"));
      return;
    }

    setPending(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setDone(true);
      // La session vient d'être réémise : le `refresh` fait rejouer les
      // composants serveur avec elle, ce qu'une simple navigation douce ne
      // garantirait pas.
      router.push("/generate");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPending(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-zinc-500 outline-none transition";

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6 sm:p-8 text-left"
    >
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
          {error}
        </div>
      )}
      {done && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          {t("success")}
        </div>
      )}

      <div>
        <label htmlFor="new-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
          {t("newPassword")}
        </label>
        <input
          id="new-password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("placeholder")}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
          {t("confirmPassword")}
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder={t("placeholder")}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={pending || done}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
      >
        {pending || done ? t("pending") : t("submit")}
      </button>
    </form>
  );
}
