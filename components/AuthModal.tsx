"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const supabase = createClient();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) setError(error.message);
      else {
        alert("Vérifiez votre boîte mail pour confirmer votre inscription !");
        onClose();
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) setError(error.message);
      else onClose();
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: "google") => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 p-6 shadow-xl border border-zinc-800 text-white relative">
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-white"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-2 text-center">
          {isSignUp ? "Créer un compte BAKUMELO" : "Connexion à BAKUMELO"}
        </h2>
        <p className="text-sm text-zinc-400 text-center mb-6">
          {isSignUp ? "Obtenez 3 crédits gratuits dès votre inscription" : "Ravi de vous revoir !"}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500 border border-red-500/20">
            {error}
          </div>
        )}

        <button
          onClick={() => handleOAuth("google")}
          className="w-full mb-4 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 py-2.5 font-medium hover:bg-zinc-700 transition"
        >
          Continuer avec Google
        </button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-zinc-800"></div>
          <span className="absolute bg-zinc-900 px-3 text-xs text-zinc-500 uppercase">ou</span>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Nom complet</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="votre@email.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-50"
          >
            {loading ? "Chargement..." : isSignUp ? "S'inscrire" : "Se connecter"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {isSignUp ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="ml-2 text-indigo-400 font-medium hover:underline"
          >
            {isSignUp ? "Se connecter" : "S'inscrire"}
          </button>
        </div>
      </div>
    </div>
  );
}