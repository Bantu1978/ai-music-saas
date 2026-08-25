"use client";

import Link from "next/link";
import Header from "@/components/Header";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-16 flex flex-col items-center text-center justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 text-indigo-400 text-sm font-medium mb-8">
          ✨ Studio de Création Musicale IA
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-3xl leading-tight">
          Transformez vos idées en <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">musique instantanée</span>
        </h1>

        <p className="mt-6 text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
          Générez des morceaux de qualité studio en quelques secondes grâce à notre technologie d'intelligence artificielle.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link
            href="/generate"
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
          >
            Commencer à créer 🎵
          </Link>
        </div>

        {/* Section Caractéristiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-lg font-bold text-indigo-400 mb-2">⚡ Génération Rapide</h3>
            <p className="text-zinc-400 text-sm">Obtenez deux compositions complètes avec paroles et arrangement en moins de 60 secondes.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-lg font-bold text-purple-400 mb-2">🎷 Genres Variés</h3>
            <p className="text-zinc-400 text-sm">De l'Afrobeats au Synthwave, explorez une grande variété de styles musicaux personnalisables.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
            <h3 className="text-lg font-bold text-pink-400 mb-2">🎧 Qualité Studio</h3>
            <p className="text-zinc-400 text-sm">Téléchargez directement vos morceaux enregistrés au format audio HD.</p>
          </div>
        </div>
      </main>
    </div>
  );
}