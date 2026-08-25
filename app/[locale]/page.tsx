"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center text-center justify-center">
        {/* Annonce du crédit offert */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-500/50 bg-indigo-950/60 text-indigo-300 text-sm font-bold mb-8 animate-pulse shadow-lg shadow-indigo-600/20">
          🎁 1 Crédit de Génération Offert à l'Inscription !
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Créez de la musique <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">Afro & Internationale</span> par IA
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
          Afrobeats, Amapiano, Makossa, Coupé-Décalé, Pop, R&B... Générez vos chansons dans la langue de votre choix.
        </p>

        <div className="mt-10">
          <Link
            href="/generate"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center inline-block"
          >
            Tester maintenant avec 1 crédit gratuit 🎵
          </Link>
        </div>
      </main>
    </div>
  );
}