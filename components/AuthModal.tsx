"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/src/i18n/navigation";
import { SIGNUP_CREDITS } from "@/lib/signupOffer";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = "phone" | "code";

const OTP_LENGTH = 6;
// E.164 : « + » suivi de 8 à 15 chiffres, indicatif pays compris.
const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Chemin absolu, exigé par Supabase pour ses redirections d'authentification.
  const nextPath = `/${locale}/generate`;

  /**
   * Entrée dans le studio après authentification.
   *
   * Navigation douce plutôt qu'un rechargement complet : le cookie de session
   * est déjà posé quand Supabase rend la main, et la requête de rendu serveur
   * le transporte. Le `refresh` qui suit force les composants serveur à se
   * rejouer avec cette session — sans lui, la garde du studio pourrait
   * répondre à partir d'un rendu antérieur à la connexion.
   */
  const entrerDansLeStudio = () => {
    onClose();
    router.push("/generate");
    router.refresh();
  };

  const resetFeedback = () => {
    setError(null);
    setNotice(null);
  };

  /**
   * En développement, /api/auth/otp/send renvoie aussi le code en clair
   * (sandbox Orange = aucun SMS réellement livré) pour pouvoir tester le
   * parcours sans attendre l'activation production. Absent en prod.
   */
  const buildSentNotice = (numero: string, devCode?: unknown) => {
    const base = t("codeSentNotice", { phone: numero });
    return typeof devCode === "string" ? `${base} ${t("devCodeNotice", { code: devCode })}` : base;
  };

  const handleGoogleLogin = async () => {
    setPending(true);
    // Conserve la langue courante au retour de l'OAuth Google
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        // Sans `select_account`, Google réutilise silencieusement la session
        // déjà ouverte dans le navigateur : l'utilisateur se retrouve connecté
        // avec un compte qu'il n'a pas choisi, et sans moyen d'en changer.
        queryParams: { prompt: "select_account" },
      },
    });
  };

  /**
   * Envoie le code par SMS (API Orange Cameroun). Sert aussi bien à la
   * première inscription qu'à une reconnexion : /api/auth/otp/verify crée le
   * compte s'il n'existe pas encore et fait tourner son mot de passe sinon —
   * un seul flux, pas de bascule inscription/connexion à faire deviner à
   * l'utilisateur.
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const numero = phone.trim();
    if (!PHONE_PATTERN.test(numero)) {
      setError(t("phoneInvalid"));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: numero }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sendCodeError"));

      setPhone(numero);
      setStep("code");
      setNotice(buildSentNotice(numero, data.devCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (code.trim().length < OTP_LENGTH) {
      setError(t("codeRequired"));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: code.trim(), fullName: fullName.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("codeError"));

      // La route a posé les cookies pour les rendus serveur suivants, mais le
      // SDK du navigateur (utilisé par SiteHeader) ignore cette session tant
      // qu'on ne la lui rejoue pas explicitement ici.
      if (data.session?.access_token && data.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      // Le profil est garanti côté serveur à l'entrée du studio.
      entrerDansLeStudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const handleChangeNumber = () => {
    setStep("phone");
    setCode("");
    resetFeedback();
  };

  const handleResend = async () => {
    resetFeedback();
    setPending(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sendCodeError"));
      setNotice(buildSentNotice(phone, data.devCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-zinc-500 outline-none transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-zinc-900 border-2 border-zinc-800 p-6 sm:p-8 rounded-2xl max-w-md w-full relative shadow-2xl my-8">
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <h2 className="text-2xl font-extrabold text-white text-center mb-2">
          {step === "code" ? t("codeTitle") : t("title")}
        </h2>
        <p className="text-zinc-400 text-xs text-center mb-6">
          {step === "code" ? t("codeSubtitle") : t("subtitle", { count: SIGNUP_CREDITS })}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            {notice}
          </div>
        )}

        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="space-y-3 mb-5">
            <div>
              <label htmlFor="auth-name" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("fullName")}
              </label>
              <input
                id="auth-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t("fullNamePlaceholder")}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="auth-phone" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("phone")}
              </label>
              <input
                id="auth-phone"
                type="tel"
                required
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className={inputClass}
              />
            </div>

            <p className="text-[11px] leading-relaxed text-zinc-500">{t("optInNotice")}</p>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
            >
              {pending ? t("pending") : t("sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode} className="space-y-3 mb-5">
            <div>
              <label htmlFor="auth-code" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("code")}
              </label>
              <input
                id="auth-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder={t("codePlaceholder")}
                className={`${inputClass} text-center text-lg tracking-[0.5em]`}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
            >
              {pending ? t("pending") : t("confirmCode")}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={handleChangeNumber}
                className="text-zinc-400 hover:text-white font-semibold"
              >
                ← {t("changeNumber")}
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={pending}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {t("resendCode")}
              </button>
            </div>
          </form>
        )}

        {step === "phone" && (
          <>
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">
                {t("separator")}
              </span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={pending}
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-3 transition shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.1 0-5.74-2.09-6.68-4.91H1.33v3.13C3.33 21.31 7.4 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.33C.48 8.29 0 10.09 0 12s.48 3.71 1.33 5.4l3.99-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.4 0 3.33 2.69 1.33 6.6l3.99 3.13c.94-2.82 3.58-4.98 6.68-4.98z"
                />
              </svg>
              {t("google")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
