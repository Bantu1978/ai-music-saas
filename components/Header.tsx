"use client";

import { useEffect, useState } from "react";
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
    // 1. Récupérer l'utilisateur courant et ses crédits
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

    // 2. Écouter les changements d'état d'authentification
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
      <header className="w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-white tracking-wider">
            BAKUMELO<span className="text-indigo-500">.AI</span>
          </span>
        </div>

        {/* Action Utilisateur / Crédits */}
        <div className="flex items-center gap-4">
          {user ? (
            <>
              {/* Solde de Crédits */}
              <div className="flex items-center gap-2 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1.5 rounded-full text-indigo-300 text-sm font-medium">
                <span>🎵</span>
                <span>{profile?.credits ?? 0} crédits</span>
              </div>

              {/* Menu Profil / Déconnexion */}
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-300 font-medium hidden sm:inline">
                  {profile?.full_name || user.email}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-2 rounded-xl transition"
                >
                  Déconnexion
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/20"
            >
              Se connecter
            </button>
          )}
        </div>
      </header>

      {/* Modale d'authentification */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}