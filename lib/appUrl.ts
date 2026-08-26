/**
 * Base publique de l'application.
 *
 * Deux services exigent une URL absolue et valide : Notch Pay, pour renvoyer le
 * client après paiement, et Suno, pour son rappel. Notch Pay refuse la requête
 * avec « The callback field must be a valid URL » dès que la valeur ne passe pas
 * sa validation — ce qui arrive dans deux cas concrets et faciles à provoquer :
 *
 *   - une adresse saisie sans schéma, « bakumelo.com » au lieu de
 *     « https://bakumelo.com » ;
 *   - l'absence de configuration, qui faisait retomber sur localhost — une
 *     adresse syntaxiquement correcte mais inutilisable depuis l'extérieur.
 *
 * Les deux sont désormais traités : le schéma est ajouté s'il manque, et
 * l'origine de la requête en cours sert de repli. Sur Vercel, cette origine est
 * exactement le domaine public du site, ce qui rend APP_URL facultative pour le
 * bon fonctionnement des retours — elle reste utile pour fixer un domaine
 * canonique lorsque plusieurs pointent sur le même déploiement.
 */

/**
 * Ramène une valeur à une origine utilisable, ou `null` si c'est impossible.
 *
 * `new URL(...).origin` fait trois choses d'un coup : il valide, il écarte tout
 * chemin ou paramètre collé par erreur, et il supprime le slash final.
 */
function origine(valeur: string | undefined | null): string | null {
  const brut = (valeur || "").trim();
  if (!brut) return null;

  const avecSchema = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;

  try {
    return new URL(avecSchema).origin;
  } catch {
    return null;
  }
}

/**
 * @param origineRequete origine de la requête en cours (`req.nextUrl.origin`),
 *        utilisée quand aucune variable n'est configurée.
 */
export function appBaseUrl(origineRequete?: string): string {
  return (
    origine(process.env.APP_URL) ??
    origine(process.env.NEXT_PUBLIC_APP_URL) ??
    origine(origineRequete) ??
    "http://localhost:3000"
  );
}
