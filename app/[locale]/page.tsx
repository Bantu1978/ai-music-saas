"use client";

import { useState, use } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";
import { dictionary } from "@/lib/dictionary";

export default function LandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Validation de la locale (en ou fr)
  const currentLocale = locale === "en" ? "en" : "fr";
  const dict = dictionary[currentLocale];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center">
      <main className="max-w-5xl w-full px-6 py-16 flex flex-col items-center text-center">
        {/* Annonce du crédit offert */}
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
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
          >
            {dict.startCreating} 🎵
          </button>

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