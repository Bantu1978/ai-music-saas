-- Ajoute le numéro de téléphone aux profils.
--
-- La vérification OTP (app/api/auth/otp/verify) doit retrouver un compte par
-- numéro pour décider s'il faut le créer ou faire tourner son mot de passe
-- temporaire. Lister tous les auth.users pour filtrer côté application ne
-- passerait pas à l'échelle ; une colonne indexée sur profiles le permet en
-- une requête, avec la clé service_role qui contourne RLS comme partout
-- ailleurs dans ces routes.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

alter table public.profiles add column if not exists phone text;

create unique index if not exists profiles_phone_idx
  on public.profiles (phone)
  where phone is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
