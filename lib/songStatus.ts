/**
 * Valeurs de l'enum Postgres `song_status`.
 *
 * Toute autre valeur fait échouer l'écriture entière avec un 22P02
 * (`invalid input value for enum song_status`). C'est ce qui est arrivé avec
 * "success" : l'UPDATE de fin de génération était rejeté, `audio_url` restait
 * nul et le téléchargement répondait « Chanson introuvable ».
 *
 * Ne pas confondre avec les statuts de tâche renvoyés par Suno
 * (`PENDING`, `TEXT_SUCCESS`, `SUCCESS`, `FAILED`), qui sont un autre domaine.
 */
export const SONG_STATUS = {
  pending: "pending",
  completed: "completed",
  failed: "failed",
} as const;

export type SongStatus = (typeof SONG_STATUS)[keyof typeof SONG_STATUS];
