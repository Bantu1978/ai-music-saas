-- Les nouveaux inscrits ne recevaient qu'un crédit au lieu de deux.
--
-- Constat : sur les douze comptes créés les 27 et 28 août, tous sans exception
-- ont démarré à 1 crédit. Vérifié en créant un compte de sonde par l'API
-- d'administration, sans passer par l'application : le profil apparaissait
-- seul, avec credits = 1.
--
-- Cause : un déclencheur sur auth.users crée le profil à l'inscription, en
-- écrivant explicitement 1. Il devance ensureProfile(), qui insère bien 2 mais
-- avec ignoreDuplicates — la ligne existant déjà, elle s'abstient, comme prévu.
-- Le défaut de colonne posé par la migration 0004 ne servait pas davantage :
-- une valeur explicite l'emporte toujours sur un défaut.
--
-- Correctif : le déclencheur cesse de fixer les crédits et laisse le défaut de
-- la colonne s'appliquer. Une seule valeur à changer désormais pour modifier
-- l'offre, au lieu de trois endroits qui divergeaient en silence.
--
-- Les autres colonnes remplies par le déclencheur sont conservées : email,
-- full_name et avatar_url, ce dernier venant des métadonnées Google. Elles ont
-- été relevées sur les profils réellement créés avant d'écrire ceci.
--
-- AVANT D'EXÉCUTER, comparer avec la définition en place :
--   select pg_get_functiondef(p.oid)
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'handle_new_user';
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

-- Filet : si la migration 0004 n'a pas été jouée, le défaut vaudrait encore 3.
alter table public.profiles
  alter column credits set default 2;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  -- Le profil peut déjà exister si ensureProfile() a devancé le déclencheur.
  -- Ne rien écraser : ses crédits ont pu être consommés entre-temps.
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rattrapage des comptes lésés.
--
-- Restreint aux profils créés depuis le 27 août — date des premières
-- inscriptions publiques — et à ceux dont le solde n'a jamais été touché : ni
-- génération, ni ajustement, ni achat. Un compte ayant déjà consommé son
-- crédit est délibérément laissé de côté : lui en ajouter un maintenant
-- reviendrait à lui offrir une génération qu'il n'a pas attendue, et rien ne
-- permet de distinguer son solde d'un solde légitimement épuisé.
update public.profiles p
   set credits = 2
 where p.credits = 1
   and p.created_at >= '2026-08-27'
   and not exists (select 1 from public.songs s where s.user_id = p.id)
   and not exists (select 1 from public.credit_transactions t where t.user_id = p.id);

-- Vérification : doit renvoyer 2.
-- select column_default from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits';
