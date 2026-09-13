-- otp_codes n'est plus utilisée : le flux OTP passe désormais par l'API
-- eSMS Verify (eSMS Africa), qui gère elle-même le code, son hash et son
-- expiration côté serveur. Voir lib/esmsVerify.ts et app/api/auth/otp/*.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

drop table if exists public.otp_codes;
