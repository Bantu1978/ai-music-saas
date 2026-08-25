"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/client";

export default function AdminPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data: profilesData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: songsData } = await supabase.from("songs").select("*").order("created_at", { ascending: false }).limit(10);

    setProfiles(profilesData || []);
    setSongs(songsData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddCredits = async (userId: string, currentCredits: number) => {
    const amountStr = prompt("Combien de crédits souhaitez-vous ajouter ?", "5");
    if (!amountStr) return;
    const amount = parseInt(amountStr, 10);

    await supabase.from("profiles").update({ credits: currentCredits + amount }).eq("id", userId);
    fetchData();
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-10">
        <h1 className="text-3xl font-extrabold mb-8">Console d'Administration</h1>

        {loading ? (
          <p className="text-zinc-400">Chargement des données Supabase...</p>
        ) : (
          <div className="space-y-10">
            {/* Liste des Utilisateurs & Gestion des Crédits */}
            <section className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 text-indigo-400">Utilisateurs & Crédits</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-800 text-zinc-400">
                    <tr>
                      <th className="py-3 px-2">Email / Nom</th>
                      <th className="py-3 px-2">Crédits</th>
                      <th className="py-3 px-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {profiles.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 px-2">{p.email || p.full_name || "Utilisateur"}</td>
                        <td className="py-3 px-2 font-bold text-indigo-300">{p.credits}</td>
                        <td className="py-3 px-2">
                          <button
                            onClick={() => handleAddCredits(p.id, p.credits)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-xs px-3 py-1.5 rounded-lg font-bold"
                          >
                            + Ajouter crédits
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Historique des Dernières Chansons */}
            <section className="bg-zinc-900 border-2 border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-4 text-purple-400">Dernières Générations</h2>
              <div className="space-y-3">
                {songs.map((song) => (
                  <div key={song.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm">{song.title}</h4>
                      <p className="text-xs text-zinc-400">{song.genre} • {song.status}</p>
                    </div>
                    {song.audio_url && <audio controls src={song.audio_url} className="h-8 w-48 sm:w-64" />}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}