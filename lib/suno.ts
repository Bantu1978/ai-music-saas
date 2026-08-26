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

const RECORD_INFO_URL = "https://api.sunoapi.org/api/v1/generate/record-info";

/**
 * État d'une tâche, normalisé.
 *
 * `PENDING` couvre aussi bien une génération réellement en cours qu'un incident
 * réseau ou une réponse illisible : dans tous ces cas la conduite à tenir est la
 * même — réessayer plus tard, ne rien conclure.
 */
export type SunoTaskResult =
  | { status: "SUCCESS"; audioUrl: string; lyrics: string | null; title: string | null }
  | { status: "FAILED"; error: string }
  | { status: "PENDING" };

/**
 * Interroge Suno sur une tâche et en tire un verdict exploitable.
 *
 * Concentré ici parce que deux appelants en dépendent : le suivi côté client
 * (/api/generate/status) et le rattrapage côté administration, qui doit pouvoir
 * conclure sur une génération abandonnée. Les faire diverger reviendrait à ce
 * que la console et le studio ne racontent pas la même histoire.
 */
export async function fetchSunoTask(
  taskId: string,
  apiKey: string,
  timeoutMs = 20_000
): Promise<SunoTaskResult> {
  let payload: SunoRecordInfoResponse | null = null;

  try {
    const res = await fetch(`${RECORD_INFO_URL}?taskId=${encodeURIComponent(taskId)}`, {
      headers: { Authorization: `Bearer ${apiKey.trim()}` },
      signal: AbortSignal.timeout(timeoutMs),
    });

    const raw = await res.text();
    try {
      payload = JSON.parse(raw) as SunoRecordInfoResponse;
    } catch {
      // Réponse non-JSON : état transitoire.
      return { status: "PENDING" };
    }
  } catch {
    // Incident réseau ou dépassement de délai : transitoire également.
    return { status: "PENDING" };
  }

  const task = payload?.data ?? {};

  if (task.status === "SUCCESS" && task.response) {
    const clip = extractClips(task.response)[0];
    const audioUrl =
      clip?.audioUrl || clip?.audio_url || clip?.stream_url || clip?.cdn_url;

    // Un SUCCESS sans piste audio n'est pas exploitable : traité comme en cours
    // plutôt que comme un échec, la piste pouvant encore apparaître.
    if (audioUrl) {
      return {
        status: "SUCCESS",
        audioUrl,
        lyrics: clip?.metadata?.prompt || clip?.lyric || clip?.prompt || null,
        title: clip?.title || null,
      };
    }
  }

  if (task.status === "FAILED" || task.status === "CREATE_TASK_FAILED") {
    return {
      status: "FAILED",
      error: task.errorMessage || "La génération a échoué chez Suno.",
    };
  }

  return { status: "PENDING" };
}
