-- Journal des paiements Notch Pay.
--
-- Indispensable à l'attribution des crédits : un webhook peut être rejoué,
-- arriver deux fois, ou croiser le retour navigateur du client. Sans trace
-- durable et sans clé unique, le même encaissement créditerait plusieurs fois.
--
-- C'est la référence qui sert de verrou : elle est primaire, et le passage
-- 'pending' -> 'complete' n'est possible qu'une seule fois (l'UPDATE est
-- conditionné au statut, et le nombre de lignes modifiées est vérifié).
--
-- Le montant est enregistré ici au moment de l'initialisation, à partir du
-- catalogue serveur : la confrontation avec le montant renvoyé par Notch Pay
-- interdit qu'un paiement de 100 FCFA débloque un pack à 19 900.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

create table if not exists public.payments (
  reference     text primary key,
  user_id       uuid not null references auth.users (id) on delete cascade,
  pack          text not null,
  credits       integer not null check (credits > 0),
  amount        integer not null check (amount > 0),
  currency      text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'complete', 'failed')),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_status_idx  on public.payments (status);

-- Aucune politique n'est définie : RLS activé sans politique ferme la table à
-- tout le monde sauf service_role, qui la contourne. Le navigateur n'a aucune
-- raison de lire ou d'écrire ici.
alter table public.payments enable row level security;
