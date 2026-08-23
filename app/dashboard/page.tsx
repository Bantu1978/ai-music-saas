import Link from 'next/link';

export default async function DashboardPage() {
  const stats = [
    { label: 'Chansons créées', value: '12' },
    { label: 'Crédits restants', value: '48' },
    { label: 'Abonnement', value: 'Pro' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* En-tête */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tableau de bord</h1>
            <p className="text-slate-400 mt-1">Gérez vos créations musicales et vos crédits.</p>
          </div>
          <Link
            href="/dashboard/create"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition"
          >
            + Créer une chanson
          </Link>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <p className="text-sm font-medium text-slate-400">{stat.label}</p>
              <p className="text-3xl font-semibold mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Section Principale / Historique */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold">Vos dernières générations</h2>
          <div className="border border-dashed border-slate-800 rounded-lg p-12 text-center text-slate-500">
            Aucune chanson générée pour le moment. Cliquez sur "Créer une chanson" pour commencer.
          </div>
        </div>

      </div>
    </div>
  );
}