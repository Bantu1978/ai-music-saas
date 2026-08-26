/**
 * Formes de réponse de l'API sunoapi.org.
 *
 * L'API n'expose pas de schéma stable et alterne camelCase et snake_case selon
 * les champs : tout est donc optionnel, et les accès restent défensifs côté
 * appelant. Ces types remplacent les `any` qui masquaient ces incertitudes.
 */

/** Un morceau renvoyé dans le résultat d'une tâche terminée. */
export type SunoClip = {
  audioUrl?: string;
  audio_url?: string;
  stream_url?: string;
  cdn_url?: string;
  title?: string;
  lyric?: string;
  prompt?: string;
  metadata?: { prompt?: string };
};

/** Réponse de POST /api/v1/generate — création de la tâche. */
export type SunoGenerateResponse = {
  data?: { taskId?: string; task_id?: string };
  taskId?: string;
  msg?: string;
  error?: string;
};

/** Réponse de GET /api/v1/generate/record-info — suivi de la tâche. */
export type SunoRecordInfoResponse = {
  data?: {
    status?: string;
    errorMessage?: string;
    /** Forme trop variable pour être décrite ici : voir `extractClips`. */
    response?: unknown;
  };
};

/**
 * Extrait la liste des morceaux d'une réponse terminée.
 *
 * L'API place les morceaux tantôt sous une clé `sunoData`, tantôt directement,
 * et sous forme de tableau ou d'objet indexé selon les cas. Toute la narration
 * de types est concentrée ici pour que les appelants restent lisibles.
 */
export function extractClips(response: unknown): SunoClip[] {
  if (!response || typeof response !== "object") return [];

  const nested = (response as { sunoData?: unknown }).sunoData;
  const container = nested ?? response;

  if (Array.isArray(container)) return container as SunoClip[];
  if (typeof container === "object") {
    return Object.values(container as Record<string, SunoClip>);
  }
  return [];
}
