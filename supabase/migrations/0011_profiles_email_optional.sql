-- L'email devient optionnel sur profiles.
--
-- Un compte créé par SMS (app/api/auth/otp/verify) n'a pas d'adresse email :
-- auth.users.email est null, et le déclencheur handle_new_user() reproduit
-- cette valeur telle quelle. Avec la contrainte NOT NULL héritée du flux
-- email/Google d'origine, cette insertion échouait — Postgres annulait toute
-- la transaction, donc auth.users elle-même refusait de créer l'utilisateur
-- (message générique "Database error creating new user" côté GoTrue).
--
-- Reproduit en insérant directement un profil sans email :
--   null value in column "email" of relation "profiles" violates not-null constraint
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

alter table public.profiles alter column email drop not null;
