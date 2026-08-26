"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Mode = "signin" | "signup" | "reset";

const MIN_PASSWORD_LENGTH = 8;

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const supabase = createClient();

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const nextPath = `/${locale}/generate`;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
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

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError(t("emailRequired"));
      return;
    }

    setPending(true);
    try {
      const returnTo = `/${locale}/auth/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`,
      });
      if (resetError) throw resetError;

      // Message volontairement identique que l'adresse existe ou non : ne pas
      // transformer ce formulaire en oracle d'existence de compte.
      setNotice(t("resetSent"));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError(t("emailRequired"));
      return;
    }
    if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordTooShort"));
      return;
    }

    setPending(true);
    try {
      if (mode === "signin") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        onClose();
        // Le profil est garanti côté serveur à l'entrée du studio.
        window.location.assign(nextPath);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() || null },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (signUpError) throw signUpError;

      // Sans session, le projet Supabase exige une confirmation par email.
      if (!data.session) {
        setNotice(t("confirmSent"));
        setPassword("");
        return;
      }

      onClose();
      window.location.assign(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  };

  const inputClass =
    "w-full bg-zinc-950 border-2 border-zinc-700 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-zinc-500 outline-none transition";
  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-xs font-bold rounded-lg transition ${
      active ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"
    }`;

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
          {mode === "reset" ? t("resetTitle") : t("title")}
        </h2>
        <p className="text-zinc-400 text-xs text-center mb-6">
          {mode === "reset" ? t("resetSubtitle") : t("subtitle")}
        </p>

        {mode !== "reset" && (
        <div className="flex gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-xl mb-6">
          <button type="button" onClick={() => switchMode("signin")} className={tabClass(mode === "signin")}>
            {t("tabSignIn")}
          </button>
          <button type="button" onClick={() => switchMode("signup")} className={tabClass(mode === "signup")}>
            {t("tabSignUp")}
          </button>
        </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
            <p>{notice}</p>
            {/* Les deux notices possibles annoncent l'envoi d'un email. Tant que le
                SMTP personnalisé BAKUMELO n'est pas en place, l'expéditeur reste
                Supabase : on prévient pour éviter que le message soit ignoré ou
                pris pour du spam. À retirer une fois le SMTP configuré. */}
            <p className="mt-2 text-emerald-300/70 leading-relaxed">{t("senderNotice")}</p>
          </div>
        )}

        <form onSubmit={mode === "reset" ? handleResetRequest : handleEmailSubmit} className="space-y-3 mb-5">
          {mode === "signup" && (
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
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t("email")}
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className={inputClass}
            />
          </div>

          {mode !== "reset" && (
          <div>
            <label htmlFor="auth-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
              {t("password")}
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              className={inputClass}
            />
          </div>
          )}

          {mode === "signin" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2"
              >
                {t("forgotPassword")}
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            {pending
              ? t("pending")
              : mode === "reset"
                ? t("resetSubmit")
                : mode === "signin"
                  ? t("submitSignIn")
                  : t("submitSignUp")}
          </button>
        </form>

        {mode === "reset" ? (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="w-full text-center text-xs text-zinc-400 hover:text-white font-semibold"
          >
            ← {t("backToSignIn")}
          </button>
        ) : (
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

          <p className="mt-5 text-center text-xs text-zinc-500">
            {mode === "signin" ? t("noAccount") : t("hasAccount")}{" "}
            <button
              type="button"
              onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
              className="text-indigo-400 hover:text-indigo-300 font-bold underline underline-offset-2"
            >
              {mode === "signin" ? t("tabSignUp") : t("tabSignIn")}
            </button>
          </p>
          </>
        )}

      </div>
    </div>
  );
}
