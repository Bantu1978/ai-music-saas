"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "./AuthModal";
import { dictionary } from "@/lib/dictionary";

export default function UserNavbar() {
  const router = useRouter();
  const pathname = usePathname();

  // Détection de la locale actuelle
  const initialLocale = pathname?.startsWith("/en") ? "en" : "fr";
  const [currentLocale, setCurrentLocale] = useState<"fr" | "en">(initialLocale);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; credits: number } | null>(null);

  const supabase = createClient();
  const dict = dictionary[currentLocale];

  // Basculement instantané FR / EN avec mise à jour du chemin
  const toggleLocale = (newLocale: "fr" | "en") => {
    setCurrentLocale(newLocale);
    if (!pathname) return;
    const newPath = pathname.replace(/^\/(fr|en)/, `/${newLocale}`);
    router.push(newPath);
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        const { data } = await supabase.from("profiles").select("full_name, credits").eq("id", user.id).single();
        setProfile(data);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const { data } = await supabase.from("profiles").select("full_name, credits").eq("id", currentUser.id).single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push(`/${currentLocale}`);
  };

  return (
    <>
      <div className="w-full flex justify-end items-center gap-3 p-4 sm:px-8 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 border-b border-zinc-800/50">
        {/* Sélecteur FR/EN 0ms */}
        <div className="flex border-2 border-zinc-700 rounded-xl overflow-hidden bg-zinc-900 text-xs font-bold">
          <button
            onClick={() => toggleLocale("fr")}
            className={`px-3 py-1.5 transition ${currentLocale === "fr" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            FR
          </button>
          <button
            onClick={() => toggleLocale("en")}
            className={`px-3 py-1.5 transition ${currentLocale === "en" ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-white"}`}
          >
            EN
          </button>
        </div>

        {/* Informations Utilisateur & Déconnexion */}
        {user ? (
          <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 px-4 py-2 rounded-2xl shadow-xl">
            <span className="text-xs font-bold text-zinc-300 hidden sm:inline">
              {profile?.full_name || user.email}
            </span>
            <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-black px-3 py-1 rounded-full">
              🎵 {profile?.credits ?? 0} {dict.credits}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-3 py-1.5 rounded-xl transition"
            >
              {dict.logout}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthOpen(true)}
            className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30"
          >
            {dict.login}
          </button>
        )}
      </div>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}