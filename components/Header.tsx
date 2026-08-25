"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; credits: number } | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Détection de la langue courante (ex: 'fr' ou 'en')
  const currentLocale = pathname?.split("/")[1] === "fr" ? "fr" : "en";

  useEffect(() => {
    const getUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, credits")
          .eq("id", user.id)
          .single();
        setProfile(data);
      }
    };

    getUserProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, credits")
          .eq("id", currentUser.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // Changement de langue dynamique
  const switchLocale = (newLocale: string) => {
    if (!pathname) return;
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  };

  return (
    <>
      <header className="w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        {/* Branding unifié BAKUMELO */}
        <Link href={`/${currentLocale}`} className="flex items-center gap-2">
          <span className="text-xl sm:text-2xl font-black text-white tracking-wider">
            BAKUMELO
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-300">
          <Link href={`/${currentLocale}`} className="hover:text-white transition">Accueil</Link>
          <Link href={`/${currentLocale}/generate`} className="hover:text-white transition">Créer un morceau</Link>
          <Link href={`/${currentLocale}/pricing`} className="hover:text-white transition">Tarifs</Link>
          <Link href={`/${currentLocale}/admin`} className="hover:text-white transition">Admin</Link>
        </nav>

        {/* Actions & Selecteur i18n */}
        <div className="flex items-center gap-3">
          {/* Sélecteur de langue EN / FR */}
          <div className="flex border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900 text-xs font-bold">
            <button
              onClick={() => switchLocale("fr")}
              className={`px-2.5 py-1 transition ${currentLocale === "fr" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              FR
            </button>
            <button
              onClick={() => switchLocale("en")}
              className={`px-2.5 py-1 transition ${currentLocale === "en" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
            >
              EN
            </button>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <div className="bg-indigo-950/80 border border-indigo-500/40 px-3 py-1 rounded-full text-indigo-300 text-xs sm:text-sm font-bold">
                🎵 {profile?.credits ?? 0}
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg transition hidden sm:inline"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm px-3.5 py-2 rounded-xl transition"
            >
              Connexion
            </button>
          )}

          {/* Bouton Menu Burger (Mobile & Tablette) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-zinc-300 hover:text-white border border-zinc-800 rounded-lg"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Navigation Mobile / Tablette */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex flex-col gap-4 text-sm font-semibold text-zinc-300">
          <Link href={`/${currentLocale}`} onClick={() => setMobileMenuOpen(false)}>Accueil</Link>
          <Link href={`/${currentLocale}/generate`} onClick={() => setMobileMenuOpen(false)}>Créer un morceau</Link>
          <Link href={`/${currentLocale}/pricing`} onClick={() => setMobileMenuOpen(false)}>Tarifs</Link>
          <Link href={`/${currentLocale}/admin`} onClick={() => setMobileMenuOpen(false)}>Admin</Link>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}