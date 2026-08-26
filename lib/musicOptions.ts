/**
 * Choix musicaux offerts au studio.
 *
 * Partagés entre le formulaire et /api/generate : le serveur valide contre
 * exactement la liste que le client propose, plutôt que de faire confiance au
 * corps de la requête. Une valeur inconnue retombe sur la valeur par défaut au
 * lieu d'être injectée telle quelle dans la consigne envoyée à Suno.
 */

export const GENRES = [
  "Afrobeats",
  "Amapiano",
  "Makossa",
  "Coupé-Décalé",
  "Bikutsi",
  "Zouglou",
  "Highlife",
  "Rumba Congolaise",
  "Afro-Pop",
  "Gospel Africain",
  "Pop",
  "Hip-Hop / Rap",
  "R&B",
  "Synthwave / Electro",
  "Rock",
  "Zouk",
  "Reggae / Dancehall",
] as const;

export const DEFAULT_GENRE = "Afrobeats";

/**
 * Style de voix. `any` laisse Suno décider, ce qui reste le comportement
 * d'avant l'ajout de ce choix.
 */
export const VOICES = ["any", "female", "male"] as const;
export type Voice = (typeof VOICES)[number];
export const DEFAULT_VOICE: Voice = "any";

/**
 * Consigne de voix insérée dans la description envoyée à Suno.
 *
 * En mode non-custom, la description est le seul canal : ni la voix ni la
 * langue n'ont de paramètre dédié dans l'API.
 */
export const VOICE_PROMPT: Record<Voice, string | null> = {
  any: null,
  female: "voix féminine",
  male: "voix masculine",
};

/**
 * Langue de chant. `auto` conserve le comportement historique — Suno écrit les
 * paroles dans la langue du texte saisi.
 *
 * Les autres valeurs sont les noms de langue tels qu'ils sont affichés et tels
 * qu'ils sont transmis à Suno : pas de table de correspondance à maintenir, et
 * la liste reste lisible dans `prompt_used`.
 */
export const LANGUAGES = [
  "auto",
  "Français",
  "Anglais",
  "Pidgin camerounais",
  "Lingala",
  "Douala",
  "Ewondo",
  "Bassa",
  "Wolof",
  "Swahili",
  "Espagnol",
  "Portugais",
] as const;

export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = "auto";

export function isVoice(value: unknown): value is Voice {
  return typeof value === "string" && (VOICES as readonly string[]).includes(value);
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function isGenre(value: unknown): value is (typeof GENRES)[number] {
  return typeof value === "string" && (GENRES as readonly string[]).includes(value);
}
