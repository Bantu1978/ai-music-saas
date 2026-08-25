"use client";

import Header from "@/components/Header";

export default function PricingPage() {
  const PLANS = [
    { name: "Gratuit", credits: "3 crédits", price: "0 €", desc: "Pour découvrir BAKUMELO", button: "Plan actuel", current: true },
    { name: "Starter", credits: "50 crédits / mois", price: "9.99 €", desc: "Idéal pour les créateurs occasionnels", button: "S'abonner" },
    { name: "Pro", credits: "200 crédits / mois", price: "24.99 €", desc: "Pour les passionnés et producteurs", button: "S'abonner", popular: true },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Espace Tarifs & Crédits</h1>
          <p className="mt-3 text-zinc-400 text-sm sm:text-base">Choisissez l'offre adaptée à vos besoins musicaux.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-2xl bg-zinc-900/80 p-8 border-2 flex flex-col justify-between relative ${
                plan.popular ? "border-indigo-500 shadow-xl shadow-indigo-600/20" : "border-zinc-800"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full">
                  Plus populaire
                </span>
              )}
              <div>
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="text-zinc-400 text-xs mt-1">{plan.desc}</p>
                <div className="my-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  {plan.price !== "0 €" && <span className="text-zinc-500 text-sm"> / mois</span>}
                </div>
                <div className="border-t border-zinc-800 pt-4 text-sm font-semibold text-indigo-400 mb-6">
                  ✨ {plan.credits}
                </div>
              </div>

              <button
                disabled={plan.current}
                className={`w-full py-3 rounded-xl font-bold text-sm transition ${
                  plan.current
                    ? "bg-zinc-800 text-zinc-500 cursor-default"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                }`}
              >
                {plan.button}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}