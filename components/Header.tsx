"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";

interface Profile {
  full_name: string | null;
  credits: number;
}

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const supabase = createClient();

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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
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
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <header className="w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        {/* Logo cliquable ramenant à l'accueil */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black text-white tracking-wider group-hover:opacity-90 transition">
            BAKUMELO<span className="text-indigo-500">.AI</span>
          </span>
        </Link>

        {/* Navigation & Profil */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="/" className="hover:text-white transition">Accueil</Link>
            <Link href="/generate" className="hover:text-white transition">Créer un morceau</Link>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="flex items-center gap-2 bg-indigo-950/80 border border-indigo-500/40 px-3 py-1.5 rounded-full text-indigo-300 text-sm font-semibold shadow-inner">
                  <span>🎵</span>
                  <span>{profile?.credits ?? 0} crédits</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-300 font-medium hidden sm:inline">
                    {profile?.full_name || user.email}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-xs border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3.5 py-2 rounded-xl transition"
                  >
                    Déconnexion
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition shadow-lg shadow-indigo-600/25"
              >
                Se connecter
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}