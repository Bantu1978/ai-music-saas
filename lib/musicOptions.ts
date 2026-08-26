/**
 * Choix musicaux offerts au studio.
 *
 * Partagés entre le formulaire et /api/generate : le serveur valide contre
 * exactement la liste que le client propose, plutôt que de faire confiance au
 * corps de la requête. Une valeur inconnue retombe sur la valeur par défaut au
 * lieu d'être injectée telle quelle dans la consigne envoyée à Suno.
 *
 * Deux principes tirés de la documentation de Suno, et qui expliquent la forme
 * de ce fichier :
 *
 *   1. Les tags de style doivent être en anglais. Suno les reconnaît « bien
 *      plus fiablement » qu'en français. Chaque entrée porte donc un libellé
 *      affiché et une consigne anglaise, distincts.
 *
 *   2. Les genres africains exigent des instruments nommés. L'amapiano « vit ou
 *      meurt sur son log drum et ses piano stabs », l'afrobeat sur son groove
 *      ouest-africain et ses cuivres. Sans eux, le résultat dérive vers de la
 *      dance générique. Les consignes ci-dessous nomment donc les instruments
 *      caractéristiques de chaque style.
 *
 * Seuls figurent ici les styles et les langues que Suno documente comme
 * fonctionnels. Les genres régionaux non documentés — makossa, bikutsi,
 * coupé-décalé, zouglou, rumba congolaise, zouk — et les langues sans données
 * d'entraînement — douala, ewondo, bassa, lingala, wolof, pidgin — ont été
 * retirés : les proposer revenait à faire dépenser un crédit contre une
 * promesse que le modèle ne tient pas.
 */

export type Genre = {
  /** Identifiant stable, seul transmis par le navigateur. */
  id: string;
  /** Libellé affiché, et conservé dans l'historique des morceaux. */
  label: string;
  /** Tags anglais envoyés à Suno, instruments compris. */
  prompt: string;
  /**
   * Style que Suno ne documente pas.
   *
   * Il est décrit par ses instruments plutôt que par son nom, ce qui donne au
   * modèle de quoi travailler même s'il ignore l'étiquette. Le résultat reste
   * moins prévisible que sur un genre documenté : le studio le signale, pour
   * qu'un client sache avant de dépenser son crédit.
   */
  experimental?: boolean;
};

export const GENRES: Genre[] = [
  // --- Afrique, styles documentés par Suno ---
  {
    id: "afrobeats",
    label: "Afrobeats",
    prompt: "afrobeats, catchy hook, smooth polished production, shekere, talking drum, tropical groove",
  },
  {
    id: "afropop",
    label: "Afropop",
    prompt: "afropop, bright melodic hook, radio-ready production, kalimba, light percussion",
  },
  {
    id: "afroswing",
    label: "Afroswing",
    prompt: "afroswing, laid-back swung groove, trap-tinged drums, melodic vocal flow",
  },
  {
    id: "classic_afrobeat",
    label: "Afrobeat classique",
    prompt: "classic afrobeat, polyrhythmic drums, brass section, funk guitar, call and response, West African groove",
  },
  {
    id: "afro_house",
    label: "Afro House",
    prompt: "afro house, tribal drums, deep bassline, organic percussion, festival energy",
  },
  {
    id: "amapiano",
    label: "Amapiano",
    prompt: "amapiano, log drum bass, piano stabs, deep house rhythm, hypnotic South African groove",
  },

  // --- Cameroun : décrits par leurs instruments, faute d'être documentés ---
  //
  // Suno ne connaît pas ces étiquettes. La consigne mène donc par la matière
  // sonore — ce que le modèle sait rendre — et ne cite le nom qu'en appui.
  // Les caractéristiques retenues sont celles que décrivent les sources sur ces
  // genres : pour le makossa, une basse électrique syncopée et des cuivres sur
  // un 4/4 rapide ; pour le bikutsi, un 6/8 ternaire et le timbre sec du
  // balafon, qu'on imite à la guitare étouffée depuis son électrification.
  {
    id: "makossa",
    label: "Makossa",
    prompt:
      "syncopated electric bass ostinato, tight horn section riffs, clean rhythm guitar, " +
      "crisp drum kit groove, 4/4 uptempo, Cameroonian makossa dance feel",
    experimental: true,
  },
  {
    id: "bikutsi",
    label: "Bikutsi",
    prompt:
      "fast 6/8 triplet groove, balafon wooden xylophone melody, muted percussive electric guitar, " +
      "layered rattles and hand percussion, call and response vocals, Cameroonian bikutsi feel",
    experimental: true,
  },
  {
    id: "gospel_amapiano",
    label: "Gospel Amapiano",
    prompt: "gospel amapiano, log drum bass, piano stabs, uplifting choir harmonies",
  },
  {
    id: "highlife",
    label: "Highlife",
    prompt: "highlife, jangly guitar lines, horn section, palm-wine groove, warm analog production",
  },
  {
    id: "kwaito",
    label: "Kwaito",
    prompt: "kwaito, slow house tempo, deep bass, chanted vocals, township groove",
  },
  {
    id: "nigerian_pop",
    label: "Pop nigériane",
    prompt: "nigerian pop, afrobeats-influenced, glossy production, catchy chorus",
  },
  {
    id: "south_african_choral",
    label: "Chorale sud-africaine",
    prompt: "south african choral, layered a cappella harmonies, call and response, rich low voices",
  },

  // --- Styles généralistes, cœur de métier de Suno ---
  { id: "pop", label: "Pop", prompt: "pop, catchy chorus, polished modern production" },
  { id: "hiphop", label: "Hip-Hop / Rap", prompt: "hip hop, hard-hitting drums, deep 808 bass, rhythmic vocal delivery" },
  { id: "rnb", label: "R&B", prompt: "contemporary R&B, smooth vocals, lush chords, laid-back groove" },
  { id: "soul", label: "Soul", prompt: "soul, warm vintage production, expressive vocals, horn section" },
  { id: "gospel", label: "Gospel", prompt: "gospel, uplifting choir, hammond organ, powerful lead vocals" },
  { id: "reggae", label: "Reggae", prompt: "reggae, offbeat guitar skank, deep bassline, relaxed groove" },
  { id: "dancehall", label: "Dancehall", prompt: "dancehall, syncopated riddim, punchy drums, energetic vocal delivery" },
  { id: "house", label: "House / Electro", prompt: "house, four-on-the-floor beat, warm synth pads, driving bassline" },
  { id: "rock", label: "Rock", prompt: "rock, distorted electric guitars, live drums, anthemic chorus" },
];

export const DEFAULT_GENRE = "afrobeats";

/**
 * Style de voix. `any` laisse Suno décider, ce qui reste le comportement
 * d'avant l'ajout de ce choix.
 */
export const VOICES = ["any", "female", "male"] as const;
export type Voice = (typeof VOICES)[number];
export const DEFAULT_VOICE: Voice = "any";

/** Consigne de voix, en anglais comme le reste des tags. */
export const VOICE_PROMPT: Record<Voice, string | null> = {
  any: null,
  female: "female vocals",
  male: "male vocals",
};

export type Language = {
  /** Identifiant stable, seul transmis par le navigateur. */
  id: string;
  /** Libellé affiché. */
  label: string;
  /** Nom anglais de la langue, tel qu'il part dans la consigne. */
  prompt: string | null;
};

/**
 * Langues de chant retenues.
 *
 * `auto` conserve le comportement historique : Suno écrit dans la langue du
 * texte saisi. Parmi les langues africaines, seules le swahili, le yoruba et le
 * zoulou disposent d'assez de données d'entraînement pour donner un résultat
 * fiable — ce sont les seules retenues.
 */
export const LANGUAGES: Language[] = [
  { id: "auto", label: "Langue de mon texte", prompt: null },
  { id: "fr", label: "Français", prompt: "French" },
  { id: "en", label: "Anglais", prompt: "English" },
  { id: "sw", label: "Swahili", prompt: "Swahili" },
  { id: "yo", label: "Yoruba", prompt: "Yoruba" },
  { id: "zu", label: "Zoulou", prompt: "Zulu" },
  { id: "es", label: "Espagnol", prompt: "Spanish" },
  { id: "pt", label: "Portugais", prompt: "Portuguese" },
];

export const DEFAULT_LANGUAGE = "auto";

export function findGenre(id: unknown): Genre {
  if (typeof id !== "string") return GENRES[0];
  return GENRES.find((g) => g.id === id) ?? GENRES.find((g) => g.id === DEFAULT_GENRE) ?? GENRES[0];
}

export function findLanguage(id: unknown): Language {
  if (typeof id !== "string") return LANGUAGES[0];
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}

export function isVoice(value: unknown): value is Voice {
  return typeof value === "string" && (VOICES as readonly string[]).includes(value);
}
