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

type View = "login" | "signupForm" | "signupCode" | "resetPhone" | "resetCode";

const OTP_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;
// E.164 sans le « + » : indicatif pays suivi du numéro. Format canonique
// unique — Supabase et nos routes API l'acceptent tel quel, sans "+" à
// rajouter ni à retirer nulle part.
const PHONE_PATTERN = /^[1-9]\d{7,14}$/;

/** Tolère un « + » que l'utilisateur aurait quand même tapé (habitude, copier-coller). */
const cleanPhoneInput = (raw: string) => raw.trim().replace(/^\+/, "");

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<View>("login");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [verificationId, setVerificationId] = useState("");
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

  const switchView = (next: View) => {
    resetFeedback();
    setCode("");
    setVerificationId("");
    setView(next);
  };

  /**
   * Avec une clé esms_test_, les routes d'envoi renvoient aussi le code en
   * clair (sandbox = aucun SMS réellement livré) pour pouvoir tester le
   * parcours sans consommer de crédit SMS. Absent avec la clé esms_live_.
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

  /** Connexion directe : aucun SMS, l'utilisateur connaît déjà son mot de passe. */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const saisie = cleanPhoneInput(phone);
    if (!PHONE_PATTERN.test(saisie)) {
      setError(t("phoneInvalid"));
      return;
    }

    setPending(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        phone: saisie,
        password,
      });
      if (signInError) throw new Error(t("loginError"));

      entrerDansLeStudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  /** Envoie le code de vérification pour une première inscription. */
  const handleSignupSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const saisie = cleanPhoneInput(phone);
    if (!PHONE_PATTERN.test(saisie)) {
      setError(t("phoneInvalid"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: saisie, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sendCodeError"));

      setPhone(saisie);
      setVerificationId(data.verificationId ?? "");
      setView("signupCode");
      setNotice(buildSentNotice(saisie, data.devCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  /** Vérifie le code puis crée le compte ; la connexion se fait ensuite ici, côté client. */
  const handleSignupVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (code.trim().length < OTP_LENGTH) {
      setError(t("codeRequired"));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: code.trim(),
          password,
          fullName: fullName.trim() || null,
          verificationId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("codeError"));

      const { error: signInError } = await supabase.auth.signInWithPassword({ phone, password });
      if (signInError) throw signInError;

      entrerDansLeStudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const handleSignupResend = async () => {
    resetFeedback();
    setPending(true);
    try {
      const res = await fetch("/api/auth/signup/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sendCodeError"));
      setVerificationId(data.verificationId ?? "");
      setNotice(buildSentNotice(phone, data.devCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  /** Envoie le code de vérification pour réinitialiser un mot de passe oublié. */
  const handleResetSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    const saisie = cleanPhoneInput(phone);
    if (!PHONE_PATTERN.test(saisie)) {
      setError(t("phoneInvalid"));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/password-reset/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: saisie }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sendCodeError"));

      setPhone(saisie);
      setVerificationId(data.verificationId ?? "");
      setView("resetCode");
      setNotice(buildSentNotice(saisie, data.devCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  /** Vérifie le code, fixe le nouveau mot de passe, puis connecte. */
  const handleResetVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFeedback();

    if (code.trim().length < OTP_LENGTH) {
      setError(t("codeRequired"));
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/password-reset/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code: code.trim(),
          newPassword: password,
          verificationId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("codeError"));

      const { error: signInError } = await supabase.auth.signInWithPassword({ phone, password });
      if (signInError) throw signInError;

      entrerDansLeStudio();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const handleResetResend = async () => {
    resetFeedback();
    setPending(true);
    try {
      const res = await fetch("/api/auth/password-reset/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || t("sendCodeError"));
      setVerificationId(data.verificationId ?? "");
      setNotice(buildSentNotice(phone, data.devCode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-zinc-500 outline-none transition";

  const titles: Record<View, string> = {
    login: t("title"),
    signupForm: t("signupTitle"),
    signupCode: t("codeTitle"),
    resetPhone: t("resetTitle"),
    resetCode: t("resetCodeTitle"),
  };

  const subtitles: Record<View, string> = {
    login: t("loginSubtitle"),
    signupForm: t("subtitle", { count: SIGNUP_CREDITS }),
    signupCode: t("codeSubtitle"),
    resetPhone: t("resetSubtitle"),
    resetCode: t("codeSubtitle"),
  };

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

        <h2 className="text-2xl font-extrabold text-white text-center mb-2">{titles[view]}</h2>
        <p className="text-zinc-400 text-xs text-center mb-6">{subtitles[view]}</p>

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

        {view === "login" && (
          <>
            <form onSubmit={handleLogin} className="space-y-3 mb-5">
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

              <div>
                <label htmlFor="auth-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {t("password")}
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("passwordPlaceholder")}
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                {pending ? t("pending") : t("login")}
              </button>

              <button
                type="button"
                onClick={() => switchView("resetPhone")}
                className="w-full text-center text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                {t("forgotPassword")}
              </button>
            </form>

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
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 disabled:opacity-50 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-3 transition shadow-lg mb-5"
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

            <p className="text-center text-xs text-zinc-400">
              {t("noAccountYet")}{" "}
              <button
                type="button"
                onClick={() => switchView("signupForm")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                {t("createAccount")}
              </button>
            </p>
          </>
        )}

        {view === "signupForm" && (
          <form onSubmit={handleSignupSendCode} className="space-y-3 mb-5">
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

            <div>
              <label htmlFor="auth-new-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("password")}
              </label>
              <input
                id="auth-new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholder")}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("confirmPassword")}
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
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

            <p className="text-center text-xs text-zinc-400">
              {t("alreadyHaveAccount")}{" "}
              <button
                type="button"
                onClick={() => switchView("login")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                {t("login")}
              </button>
            </p>
          </form>
        )}

        {view === "signupCode" && (
          <form onSubmit={handleSignupVerifyCode} className="space-y-3 mb-5">
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
                onClick={() => switchView("signupForm")}
                className="text-zinc-400 hover:text-white font-semibold"
              >
                ← {t("changeNumber")}
              </button>
              <button
                type="button"
                onClick={handleSignupResend}
                disabled={pending}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {t("resendCode")}
              </button>
            </div>
          </form>
        )}

        {view === "resetPhone" && (
          <form onSubmit={handleResetSendCode} className="space-y-3 mb-5">
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

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
            >
              {pending ? t("pending") : t("sendCode")}
            </button>

            <button
              type="button"
              onClick={() => switchView("login")}
              className="w-full text-center text-xs text-zinc-400 hover:text-white font-semibold"
            >
              ← {t("backToLoginLink")}
            </button>
          </form>
        )}

        {view === "resetCode" && (
          <form onSubmit={handleResetVerifyCode} className="space-y-3 mb-5">
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

            <div>
              <label htmlFor="auth-new-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("newPassword")}
              </label>
              <input
                id="auth-new-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("newPasswordPlaceholder")}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="auth-confirm-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {t("confirmPassword")}
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("confirmPasswordPlaceholder")}
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
            >
              {pending ? t("pending") : t("resetSubmit")}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => switchView("resetPhone")}
                className="text-zinc-400 hover:text-white font-semibold"
              >
                ← {t("changeNumber")}
              </button>
              <button
                type="button"
                onClick={handleResetResend}
                disabled={pending}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 disabled:opacity-50"
              >
                {t("resendCode")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
