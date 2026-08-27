import { getTranslations } from "next-intl/server";
import { Link } from "@/src/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabaseServer";
import { SONG_STATUS } from "@/lib/songStatus";
import { ensureProfile } from "@/lib/profile";

// Les chiffres affichés proviennent de la base : l'ancienne version montrait
// des statistiques inventées en dur (12 chansons, 48 crédits, abonnement Pro).
export default async function DashboardPage() {
  const t = await getTranslations("Dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-extrabold mb-2">{t("title")}</h1>
        <p className="text-zinc-400">{t("signedOut")}</p>
      </div>
    );
  }

  const admin = getSupabaseAdmin();

  const [profile, { data: songs }] = await Promise.all([
    ensureProfile(admin, user),
    admin
      .from("songs")
      .select("id, title, genre, status, audio_url, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const list = songs ?? [];
  const stats = [
    { label: t("statSongs"), value: list.filter((s) => s.status === SONG_STATUS.completed).length },
    { label: t("statCredits"), value: profile?.credits ?? 0 },
    { label: t("statPending"), value: list.filter((s) => s.status === SONG_STATUS.pending).length },
  ];

  return (
    <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-zinc-400 mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/generate"
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg transition"
        >
          {t("create")}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-sm font-medium text-zinc-400">{stat.label}</p>
            <p className="text-3xl font-semibold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-xl font-semibold">{t("history")}</h2>

        {list.length === 0 ? (
          <div className="border border-dashed border-zinc-800 rounded-lg p-12 text-center text-zinc-500">
            {t("empty")}
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((song) => (
              <li
                key={song.id}
                className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0">
                  <h3 className="font-bold text-sm truncate">{song.title}</h3>
                  <p className="text-xs text-zinc-400">
                    {song.genre} • {song.status}
                  </p>
                </div>

                {/* Le téléchargement était absent de cette page : seul un
                    lecteur audio y figurait, et récupérer son morceau imposait
                    de repasser par le studio. Il devient l'action visible de
                    chaque ligne. La colonne passe en pile sur mobile, faute de
                    quoi lecteur et bouton s'écrasent. */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:shrink-0">
                  {song.audio_url && (
                    <audio controls src={song.audio_url} className="h-8 w-full sm:w-56" />
                  )}
                  {song.audio_url ? (
                    <a
                      href={`/api/download?songId=${encodeURIComponent(song.id)}`}
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-lg shadow-green-600/30 text-sm whitespace-nowrap"
                    >
                      <span aria-hidden="true">⬇</span>
                      {t("download")}
                    </a>
                  ) : (
                    <p className="text-xs text-zinc-500 sm:max-w-[15rem]">{t("pendingHint")}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
