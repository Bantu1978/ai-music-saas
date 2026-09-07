-- Table des codes de vérification envoyés par SMS (API Orange Cameroun).
--
-- Remplace le flux WhatsApp/Twilio géré par Supabase (signInWithOtp /
-- verifyOtp) : l'envoi passe désormais par notre propre appel à l'API
-- Orange, donc Supabase ne connaît plus le code et ne peut plus le vérifier
-- lui-même. Cette table porte tout le cycle de vie du code côté serveur ;
-- voir app/api/auth/otp/send et app/api/auth/otp/verify.
--
-- Aucune policy RLS : seule la clé service_role (qui contourne RLS) manipule
-- cette table, jamais le navigateur.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

create table if not exists public.otp_codes (
  id bigint generated always as identity primary key,
  phone text not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists otp_codes_phone_created_idx
  on public.otp_codes (phone, created_at desc);

alter table public.otp_codes enable row level security;
