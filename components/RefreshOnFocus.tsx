"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redemande le rendu des composants serveur quand l'onglet redevient actif.
 *
 * L'en-tête sait relire le solde tout seul, mais certaines décisions sont
 * prises côté serveur au chargement — au premier chef la garde du studio, qui
 * remplace le formulaire par « Crédits épuisés ». Sans revalidation, un client
 * crédité par un administrateur restait devant ce panneau jusqu'à un F5, alors
 * même que son solde était à jour en base.
 *
 * `router.refresh()` ne réinitialise pas l'état des composants client : une
 * génération en cours dans le studio n'est pas interrompue.
 *
 * `useRouter` vient de next/navigation et non du routeur localisé : rafraîchir
 * n'a pas de dimension linguistique.
 */
export default function RefreshOnFocus() {
  const router = useRouter();

  useEffect(() => {
    // `focus` et `visibilitychange` se déclenchent tous deux au retour sur
    // l'onglet, mais l'un sans l'autre selon les cas : revenir depuis une autre
    // application n'émet que `focus`. Les deux sont donc écoutés, et ce garde
    // évite la double requête quand ils arrivent ensemble.
    let last = 0;

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;

      const now = Date.now();
      if (now - last < 1000) return;
      last = now;

      router.refresh();
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
