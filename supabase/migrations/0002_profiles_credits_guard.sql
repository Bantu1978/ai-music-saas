-- Interdit toute modification de `credits` en dehors du serveur.
--
-- L'application n'écrit plus les crédits depuis le navigateur (tout passe par
-- /api/generate et /api/admin/credits avec la clé service_role), mais sans ce
-- garde-fou une politique RLS permissive sur `profiles` laisserait un
-- utilisateur connecté s'accorder des crédits avec la seule clé publique.
--
-- PostgREST exécute les requêtes de la clé service_role sous le rôle
-- `service_role` ; les clés anon/authenticated utilisent un autre rôle.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor, puis vérifier qu'une
-- génération fonctionne toujours (elle passe par service_role).

create or replace function public.prevent_client_credit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.credits is distinct from old.credits and current_user <> 'service_role' then
    raise exception 'Les crédits ne peuvent être modifiés que côté serveur.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_credits_guard on public.profiles;

create trigger profiles_credits_guard
  before update on public.profiles
  for each row
  execute function public.prevent_client_credit_change();
