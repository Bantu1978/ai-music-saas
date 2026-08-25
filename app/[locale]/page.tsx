"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";

export default function LandingPage() {
  const t = useTranslations("HomePage");
  const supabase = createClient();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setIsSignedIn(Boolean(data.user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-center items-center">
      <div className="max-w-5xl w-full px-6 py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-500/50 bg-indigo-950/60 text-indigo-300 text-sm font-bold mb-8 shadow-lg shadow-indigo-600/20">
          {t("badge")}
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          {t("title")}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
          {t("subtitle")}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          {isSignedIn ? (
            <Link
              href="/generate"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
            >
              {t("ctaSignedIn")} 🎵
            </Link>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
            >
              {t("ctaSignedOut")} 🎵
            </button>
          )}

          <Link
            href="/pricing"
            className="px-8 py-4 bg-zinc-900 border-2 border-zinc-700 hover:bg-zinc-800 text-white font-bold rounded-2xl text-lg transition text-center"
          >
            {t("ctaPricing")}
          </Link>
        </div>
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}
