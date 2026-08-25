"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "@/components/AuthModal";

export default function LandingPage() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-center items-center">
      <main className="max-w-5xl w-full px-6 py-16 flex flex-col items-center text-center">
        {/* Annonce du crédit offert */}
        <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border-2 border-indigo-500/50 bg-indigo-950/60 text-indigo-300 text-sm font-bold mb-8 shadow-lg shadow-indigo-600/20">
          🎁 1 Crédit de Génération Offert à l'Inscription !
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight max-w-4xl leading-tight">
          Créez de la musique <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-500 bg-clip-text text-transparent">Afro & Internationale</span> par IA
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-400 max-w-2xl font-normal leading-relaxed">
          Afrobeats, Amapiano, Makossa, Coupé-Décalé, Pop, R&B... Générez vos chansons dans la langue de votre choix.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          {/* Bouton qui ouvre la modale de connexion */}
          <button
            onClick={() => setIsAuthOpen(true)}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-xl shadow-indigo-600/30 text-lg transition text-center"
          >
            Tester maintenant avec 1 crédit gratuit 🎵
          </button>

          <Link
            href="/pricing"
            className="px-8 py-4 bg-zinc-900 border-2 border-zinc-700 hover:bg-zinc-800 text-white font-bold rounded-2xl text-lg transition text-center"
          >
            Voir les tarifs
          </Link>
        </div>
      </main>

      {/* Modale d'authentification */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </div>
  );
}