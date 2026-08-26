/**
 * Mode « site en construction ».
 *
 * Activé par la variable d'environnement MAINTENANCE_MODE, de façon à pouvoir
 * lever le voile depuis Vercel sans redéployer de code. Les administrateurs
 * (ADMIN_EMAILS) traversent le rideau et voient le site réel : c'est ce qui
 * permet de continuer à tester en production pendant que les visiteurs voient
 * la page d'attente.
 *
 * Dispositif volontairement temporaire : sa suppression tient en un fichier et
 * quelques lignes de middleware.ts.
 */

export function isMaintenanceMode(): boolean {
  const flag = (process.env.MAINTENANCE_MODE || "").trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "on";
}

/**
 * Page d'attente, servie telle quelle par le middleware.
 *
 * Écrite en HTML autonome plutôt qu'en composant React : le seul layout racine
 * du projet vit sous app/[locale], et y accrocher une page hors langue
 * imposerait une refonte de l'arborescence pour un dispositif provisoire.
 */
export function maintenancePage(): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>BAKUMELO — Site en construction</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: #09090b;
    color: #fafafa;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    text-align: center;
  }
  main { max-width: 34rem; }
  .brand {
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: -0.03em;
    color: #818cf8;
    margin: 0 0 2rem;
  }
  .badge {
    display: inline-block;
    padding: 0.5rem 1.25rem;
    margin-bottom: 1.75rem;
    border: 2px solid rgba(129, 140, 248, 0.5);
    border-radius: 999px;
    background: rgba(30, 27, 75, 0.6);
    color: #a5b4fc;
    font-size: 0.8rem;
    font-weight: 700;
  }
  h1 { font-size: 1.75rem; font-weight: 800; margin: 0 0 0.75rem; line-height: 1.25; }
  p { margin: 0; color: #a1a1aa; line-height: 1.7; }
  .en {
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid #27272a;
    color: #71717a;
    font-size: 0.9rem;
  }
  .en strong { color: #a1a1aa; font-weight: 600; }
</style>
</head>
<body>
  <main>
    <p class="brand">BAKUMELO</p>
    <p class="badge">🎵 Bientôt disponible</p>
    <h1>Notre studio de création musicale se prépare</h1>
    <p>
      Le site est en construction. Nous mettons la dernière main à la génération
      de musique Afro &amp; Internationale par IA. Merci de revenir très bientôt.
    </p>
    <div class="en">
      <p><strong>Under construction.</strong> We are putting the finishing touches
      to our AI music studio. Please check back soon.</p>
    </div>
  </main>
</body>
</html>`;
}
