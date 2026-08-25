-- Ajoute la référence de tâche Suno sur les chansons.
-- Sans cette colonne, une génération laissée en cours (onglet fermé, rechargement)
-- ne peut plus jamais être rattachée à son résultat : la ligne reste en 'pending'.
-- À exécuter depuis Dashboard Supabase > SQL Editor.

alter table public.songs
  add column if not exists task_id text;

create index if not exists songs_task_id_idx
  on public.songs (task_id);
