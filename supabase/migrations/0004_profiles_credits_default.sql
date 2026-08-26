-- Aligne le défaut de `profiles.credits` sur l'offre d'inscription.
--
-- La colonne était à 3 alors que l'application insère explicitement sa propre
-- valeur (1 jusqu'ici, 2 désormais) : les deux divergeaient sans que rien ne le
-- signale. Tant que le profil est créé par ensureProfile(), le défaut de la
-- colonne n'est jamais utilisé — mais toute ligne créée autrement (déclencheur
-- sur auth.users, import, insertion manuelle) recevait 3 crédits.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

alter table public.profiles
  alter column credits set default 2;

-- Vérification : doit renvoyer 2.
-- select column_default from information_schema.columns
--  where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits';
