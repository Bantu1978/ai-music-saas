"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import { dictionary } from "@/lib/dictionary";
import { createClient } from "@/lib/supabase/client";

export default function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{ full_name: string | null; credits: number } | null>(null);

  const supabase = createClient();
  const currentLocale = locale === "en" ? "en" : "fr";
  const dict = dictionary[currentLocale];

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
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center relative">
      {/* BARRE DE STATUT UTILISATEUR (Visible en haut à droite) */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
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

      <main className="max-w-5xl w-full px-6 py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-500/50 bg-indigo-950/60 text-indigo-300 text-sm font-bold mb-8 shadow-lg shadow-indigo-600/20">
          🎁 {currentLocale === "en" ? "1 Free Generation Credit on Signup!" : "1 Crédit de Génération Offert à l'Inscription !"}
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          {dict.heroTitle}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
          {dict.heroDesc}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          {user ? (
            <Link
              href={`/${currentLocale}/generate`}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
            >
              {dict.create} 🎵
            </Link>
          ) : (
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
            >
              {dict.startCreating} 🎵
            </button>
          )}

          <Link
            href={`/${currentLocale}/pricing`}
            className="px-8 py-4 bg-zinc-900 border-2 border-zinc-700 hover:bg-zinc-800 text-white font-bold rounded-2xl text-lg transition text-center"
          >
            {dict.pricing}
          </Link>
        </div>
      </main>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}