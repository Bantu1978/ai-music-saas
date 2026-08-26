"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { Link, useRouter } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import AuthModal from "./AuthModal";

type Profile = { full_name: string | null; credits: number };

/**
 * En-tête unique du site : marque, navigation, sélecteur de langue,
 * solde de crédits et connexion/déconnexion.
 * Remplace l'ancien trio Header + UserNavbar + barres inline dupliquées
 * dans la landing et le studio.
 */
export default function SiteHeader() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const supabase = createClient();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async (current: User | null) => {
      if (!current) {
        if (active) {
          setProfile(null);
          setAdmin(false);
        }
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, credits")
        .eq("id", current.id)
        .single();
      if (active) setProfile(data);

      // ADMIN_EMAILS est une variable serveur : seule cette route peut dire au
      // navigateur si l'utilisateur courant est administrateur. Un échec est
      // traité comme « non administrateur » (fail closed).
      try {
        const res = await fetch("/api/admin/status");
        const status = await res.json();
        if (active) setAdmin(Boolean(status?.isAdmin));
      } catch {
        if (active) setAdmin(false);
      }
    };

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      loadProfile(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user ?? null;
      setUser(current);
      loadProfile(current);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAdmin(false);
    router.push("/");
  };

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/" className="font-black text-lg text-indigo-400 tracking-tight">
            {t("brand")}
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-xs font-bold text-zinc-400 ml-4">
            <Link href="/generate" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900 transition">
              {t("studio")}
            </Link>
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900 transition">
              {t("dashboard")}
            </Link>
            <Link href="/pricing" className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-zinc-900 transition">
              {t("pricing")}
            </Link>
            {/* Confort d'affichage uniquement : la page /admin et les routes
                /api/admin/* revérifient toutes le statut côté serveur. */}
            {admin && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-zinc-900 transition"
              >
                {t("admin")}
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <LanguageSwitcher />

            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 px-3 py-1.5 rounded-2xl">
                <span className="text-xs font-bold text-zinc-300 hidden md:inline max-w-[14rem] truncate">
                  {profile?.full_name || user.email}
                </span>
                <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                  🎵 {profile?.credits ?? 0} {t("credits")}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-3 py-1.5 rounded-xl transition"
                >
                  {t("logout")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                {t("login")}
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
