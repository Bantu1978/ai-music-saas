-- Corrige le garde-fou introduit par 0002, qui bloquait AUSSI les écritures
-- légitimes du serveur (toute génération échouait en 409).
--
-- Cause : la fonction était déclarée `security definer`. Dans ce mode,
-- `current_user` vaut le propriétaire de la fonction (postgres) et non le rôle
-- de l'appelant, donc `current_user <> 'service_role'` était toujours vrai.
--
-- Correctif : sécurité INVOKER (défaut), et détection du rôle élargie —
-- `current_user` (PostgREST fait SET LOCAL ROLE), le claim `role` du JWT, et
-- un accès direct sans contexte PostgREST (SQL Editor, psql) reste autorisé.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor. Le trigger créé par 0002
-- pointe déjà sur cette fonction : il n'y a rien d'autre à recréer.

create or replace function public.prevent_client_credit_change()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  jwt_claims text := nullif(current_setting('request.jwt.claims', true), '');
  jwt_role   text := case
                       when jwt_claims is not null then (jwt_claims::json ->> 'role')
                       else null
                     end;
begin
  if new.credits is distinct from old.credits
     -- Requête arrivée via PostgREST (API). Un accès direct à la base n'a pas
     -- ce contexte et n'est pas concerné : il est déjà privilégié.
     and jwt_claims is not null
     and current_user <> 'service_role'
     and coalesce(jwt_role, '') <> 'service_role'
  then
    raise exception 'Les crédits ne peuvent être modifiés que côté serveur.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
