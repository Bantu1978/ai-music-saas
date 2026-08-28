/**
 * Démos et témoignages de la page d'accueil.
 *
 * Les morceaux sont réels : ce sont des créations du compte administrateur,
 * donc diffusables sans demander l'accord d'un tiers. Les fichiers sont servis
 * depuis /public plutôt que depuis l'URL rendue par Suno — celle-ci pointe vers
 * un domaine nommé « tempfile » et expire, ce qui viderait la section un jour
 * sans prévenir.
 *
 * Les citations, elles, n'ont jamais été prononcées. Aucun avis client n'a
 * encore été recueilli — la colonne `songs.user_feedback` est vide sur les
 * vingt morceaux générés à ce jour. Elles sont donc marquées comme exemples à
 * l'écran, et ne doivent pas être présentées autrement : une fausse
 * recommandation attribuée à une personne inventée est une publicité
 * trompeuse, sanctionnée comme telle dans la plupart des juridictions.
 *
 * POUR PASSER AUX VRAIS TÉMOIGNAGES :
 *   1. obtenir du client son accord écrit sur la citation ET sur la diffusion
 *      publique de son morceau ;
 *   2. remplacer `citation`, `auteur` et `lieu` ci-dessous ;
 *   3. passer `illustratif` à false — le bandeau d'avertissement disparaît
 *      alors de lui-même.
 */

export type Demo = {
  /** Fichier dans /public/demos. */
  fichier: string;
  /** Titre réel du morceau. */
  titre: string;
  /** Genre réel, tel que choisi au studio. */
  genre: string;
  /** Clé de traduction de la citation, dans Testimonials. */
  citation: string;
  /** Nom affiché sous la citation. */
  auteur: string;
  /** Ville, pour ancrer le témoignage. */
  lieu: string;
};

/**
 * Faux tant que les citations n'ont pas été remplacées par de vrais retours
 * clients. Pilote le bandeau qui les signale comme exemples.
 */
export const TEMOIGNAGES_ILLUSTRATIFS = true;

export const DEMOS: Demo[] = [
  {
    fichier: "/demos/mon-berger.mp3",
    titre: "Mon Berger",
    genre: "Gospel",
    citation: "quote1",
    auteur: "Exemple",
    lieu: "Douala",
  },
  {
    fichier: "/demos/coeur-en-gratitude.mp3",
    titre: "Cœur en gratitude",
    genre: "Gospel Amapiano",
    citation: "quote2",
    auteur: "Exemple",
    lieu: "Yaoundé",
  },
  {
    fichier: "/demos/sous-la-belle-lune.mp3",
    titre: "Sous la belle lune",
    genre: "Zouk",
    citation: "quote3",
    auteur: "Exemple",
    lieu: "Kribi",
  },
];
