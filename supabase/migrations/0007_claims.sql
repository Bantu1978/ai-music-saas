-- Réclamations clients.
--
-- Le dépôt est ouvert aux visiteurs, pas seulement aux comptes connectés :
-- un client dont le paiement ou la connexion échoue est précisément celui qui
-- ne peut pas s'authentifier pour se plaindre. `user_id` est donc facultatif,
-- et `email` obligatoire — c'est le seul moyen de rappeler l'auteur.
--
-- `user_id` est en `set null` et non en `cascade` : la suppression d'un compte
-- ne doit pas effacer l'historique des litiges, qui peut valoir preuve.
--
-- `reference` est du texte libre, sans clé étrangère : le client y recopie ce
-- qu'il a sous les yeux — un numéro de paiement, un titre de morceau — et un
-- visiteur non connecté n'a de toute façon aucun identifiant à fournir.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

create table if not exists public.claims (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  email       text not null check (char_length(email) between 3 and 320),
  name        text check (char_length(name) <= 120),
  category    text not null
              check (category in ('paiement', 'generation', 'qualite', 'compte', 'autre')),
  reference   text check (char_length(reference) <= 200),
  message     text not null check (char_length(message) between 10 and 4000),
  status      text not null default 'ouverte'
              check (status in ('ouverte', 'en_cours', 'resolue')),
  admin_note  text check (char_length(admin_note) <= 4000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Le tri par défaut de la console : les plus récentes d'abord, filtrées par
-- statut. L'index composite sert exactement cette requête.
create index if not exists claims_status_created_idx
  on public.claims (status, created_at desc);

create index if not exists claims_email_created_idx
  on public.claims (email, created_at desc);

create index if not exists claims_user_id_idx on public.claims (user_id);

-- Horodatage de dernière modification, pour distinguer une réclamation traitée
-- hier d'une qui dort depuis trois semaines.
create or replace function public.claims_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists claims_set_updated_at on public.claims;
create trigger claims_set_updated_at
  before update on public.claims
  for each row execute function public.claims_touch_updated_at();

-- RLS activé sans aucune politique : la table est fermée à tout le monde sauf
-- service_role, qui la contourne. Le dépôt passe par /api/claims et la lecture
-- par /api/admin/claims, tous deux côté serveur. Sans cela, une table de
-- réclamations lisible depuis le navigateur exposerait les adresses email et
-- les litiges de tous les clients.
alter table public.claims enable row level security;
