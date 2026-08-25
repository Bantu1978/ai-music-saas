"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const [stats, setStats] = useState({ users: 0, songs: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchAdminStats = async () => {
      const { count: usersCount } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      const { count: songsCount } = await supabase.from("songs").select("*", { count: "exact", head: true });

      setStats({ users: usersCount || 0, songs: songsCount || 0 });
      setLoading(false);
    };

    fetchAdminStats();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Tableau de Bord Administrateur</h1>

        {loading ? (
          <p className="text-zinc-400">Chargement des statistiques...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-zinc-900 border-2 border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-zinc-400 text-sm font-semibold">Total Utilisateurs Inscrits</h3>
              <p className="text-4xl font-black mt-2 text-indigo-400">{stats.users}</p>
            </div>
            <div className="bg-zinc-900 border-2 border-zinc-800 p-6 rounded-2xl">
              <h3 className="text-zinc-400 text-sm font-semibold">Total Chansons Générées</h3>
              <p className="text-4xl font-black mt-2 text-purple-400">{stats.songs}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}