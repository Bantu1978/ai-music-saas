'use client';

import { useState } from 'react';

export default function CreateSongPage() {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('pop');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Appeler votre route API backend ici (ex: /api/generate)
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, genre }),
      });

      if (!res.ok) throw new Error('Erreur lors de la création');
      
      const data = await res.json();
      console.log('Chanson générée avec succès:', data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Créer une nouvelle chanson</h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Description de la chanson
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ex: Une chanson dynamique sur le thème du voyage..."
            className="w-full p-3 border rounded-md min-h-[120px]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Genre musical
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full p-3 border rounded-md bg-white"
          >
            <option value="pop">Pop</option>
            <option value="rock">Rock</option>
            <option value="hip-hop">Hip-Hop</option>
            <option value="electro">Électro</option>
            <option value="acoustic">Acoustique</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-black text-white font-medium rounded-md hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? 'Génération en cours...' : 'Générer la chanson'}
        </button>
      </form>
    </div>
  );
}