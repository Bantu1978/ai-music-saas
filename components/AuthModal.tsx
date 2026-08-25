"use client";

import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const supabase = createClient();

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    // Conserve la langue courante au retour de l'OAuth Google
    const next = encodeURIComponent(`/${locale}/generate`);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border-2 border-zinc-800 p-6 sm:p-8 rounded-2xl max-w-md w-full relative shadow-2xl">
        <button
          onClick={onClose}
          aria-label={t("close")}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white text-lg font-bold"
        >
          ✕
        </button>

        <h2 className="text-2xl font-extrabold text-white text-center mb-2">{t("title")}</h2>
        <p className="text-zinc-400 text-xs text-center mb-6">{t("subtitle")}</p>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3.5 px-4 bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl flex items-center justify-center gap-3 transition shadow-lg"
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
      </div>
    </div>
  );
}
