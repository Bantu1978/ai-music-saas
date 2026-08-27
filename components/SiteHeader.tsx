"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { Link, useRouter, usePathname } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { LanguageSwitcher } from "./LanguageSwitcher";
import AuthModal from "./AuthModal";

type Profile = { full_name: string | null; credits: number };

/**
 * En-tête unique du site : marque, navigation, sélecteur de langue,
 * solde de crédits et connexion/déconnexion.
 * Remplace l'ancien trio Header + UserNavbar + barres inline dupliquées
 * dans la landing et le studio.
 */
export default function SiteHeader() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [admin, setAdmin] = useState(false);

  // Menu déroulant des petits écrans.
  const [menuOuvert, setMenuOuvert] = useState(false);

  // Incrémenté au retour sur l'onglet, pour redemander le solde.
  const [refreshToken, setRefreshToken] = useState(0);

  const userId = user?.id ?? null;

  // 1. Identité. Une seule fois : c'est l'abonnement Supabase qui signale
  //    ensuite les connexions et déconnexions.
  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const current = session?.user ?? null;
      setUser(current);
      // Purge depuis le rappel, donc hors du corps d'un effet.
      if (!current) {
        setProfile(null);
        setAdmin(false);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Solde et statut d'administrateur.
  //
  //    Rejoué à chaque navigation et au retour sur l'onglet. L'en-tête vit dans
  //    le layout : il ne se remonte jamais tant qu'on reste dans la même langue,
  //    si bien qu'avec les seules dépendances d'origine la pastille conservait
  //    pour toute la session la valeur lue au premier chargement. Un crédit
  //    accordé par un administrateur restait alors invisible jusqu'à un F5.
  useEffect(() => {
    if (!userId) return;

    let active = true;

    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, credits")
        .eq("id", userId)
        .single();
      if (active) setProfile(data);

      // ADMIN_EMAILS est une variable serveur : seule cette route peut dire au
      // navigateur si l'utilisateur courant est administrateur. Un échec est
      // traité comme « non administrateur » (fail closed).
      try {
        const res = await fetch("/api/admin/status");
        const status = await res.json();
        if (active) setAdmin(Boolean(status?.isAdmin));
      } catch {
        if (active) setAdmin(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, pathname, refreshToken]);

  // 3. Retour sur l'onglet : le solde a pu changer pendant l'absence, c'est
  //    précisément le cas d'un crédit accordé par un administrateur pendant
  //    que le client attend. Les écritures d'état partent d'un gestionnaire
  //    d'événement, jamais du corps d'un effet.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        setRefreshToken((token) => token + 1);
      }
    };

    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAdmin(false);
    router.push("/");
  };

  // Liste unique, servie deux fois : la barre horizontale sur grand écran, le
  // panneau déroulant sur téléphone. Les dupliquer exposerait à ce qu'un lien
  // ajouté un jour n'existe que d'un côté.
  // Le lien Admin reste un confort d'affichage : la page /admin et les routes
  // /api/admin/* revérifient toutes le statut côté serveur.
  const liens = [
    { href: "/generate", libelle: t("studio"), accent: false },
    { href: "/dashboard", libelle: t("dashboard"), accent: false },
    { href: "/pricing", libelle: t("pricing"), accent: false },
    // Ouverte à tous, connectés ou non : un client bloqué au paiement ou à la
    // connexion doit pouvoir la joindre sans compte.
    { href: "/support", libelle: t("support"), accent: false },
    ...(admin ? [{ href: "/admin", libelle: t("admin"), accent: true }] : []),
  ];

  return (
    <>
      <header className="w-full sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          {/* Bouton de menu, réservé aux écrans où la barre horizontale ne tient
              pas. Sans lui, un visiteur sur téléphone n'avait aucun accès au
              studio, à ses créations ni aux tarifs. */}
          <button
            type="button"
            onClick={() => setMenuOuvert((ouvert) => !ouvert)}
            aria-expanded={menuOuvert}
            aria-controls="menu-mobile"
            aria-label={menuOuvert ? t("menuClose") : t("menuOpen")}
            className="sm:hidden -ml-1 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-900 transition"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOuvert ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 6h14M3 10h14M3 14h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>

          <Link href="/" className="font-black text-lg text-indigo-400 tracking-tight">
            {t("brand")}
          </Link>

          <nav className="hidden sm:flex items-center gap-1 text-xs font-bold text-zinc-400 ml-4">
            {liens.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className={`px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition ${
                  lien.accent ? "text-amber-400 hover:text-amber-300" : "hover:text-white"
                }`}
              >
                {lien.libelle}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 ml-auto">
            <LanguageSwitcher />

            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 px-3 py-1.5 rounded-2xl">
                <span className="text-xs font-bold text-zinc-300 hidden md:inline max-w-[14rem] truncate">
                  {profile?.full_name || user.email}
                </span>
                <span className="bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-xs font-black px-3 py-1 rounded-full whitespace-nowrap">
                  🎵 {profile?.credits ?? 0} {t("credits")}
                </span>
                <button
                  onClick={handleSignOut}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-bold px-3 py-1.5 rounded-xl transition"
                >
                  {t("logout")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsAuthOpen(true)}
                className="text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition shadow-lg shadow-indigo-600/30"
              >
                {t("login")}
              </button>
            )}
          </div>
        </div>

        {/* Panneau déroulant. Il se ferme au clic sur un lien plutôt que sur un
            effet de changement de route : une écriture d'état depuis un
            gestionnaire d'événement évite les rendus en cascade. */}
        {menuOuvert && (
          <nav
            id="menu-mobile"
            className="sm:hidden border-t border-zinc-800/50 bg-zinc-950/95 px-4 py-2 flex flex-col"
          >
            {liens.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={() => setMenuOuvert(false)}
                className={`py-3 text-sm font-bold border-b border-zinc-800/50 last:border-b-0 transition ${
                  lien.accent ? "text-amber-400" : "text-zinc-300 hover:text-white"
                }`}
              >
                {lien.libelle}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
