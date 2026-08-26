-- Mémorise la référence générée par Notch Pay, distincte de la nôtre.
--
-- Découvert en ouvrant un vrai paiement de test : Notch Pay ne réutilise pas la
-- référence qu'on lui envoie. Il génère la sienne (`trx.test_…` / `trx.…`) et
-- conserve la nôtre sous `merchant_reference` et `trxref`.
--
-- Conséquences, si l'on ne garde que la nôtre :
--   - GET /payments/{notre_reference} répond 404 : impossible de vérifier quoi
--     que ce soit, donc aucun paiement n'est jamais crédité ;
--   - un webhook qui annonce la référence de Notch Pay ne correspond à aucune
--     ligne de notre journal.
--
-- La nôtre reste la clé primaire — elle est stable et connue avant l'appel.
-- Celle de Notch Pay s'ajoute à côté, et le dénouement accepte l'une ou l'autre.
--
-- À exécuter depuis Dashboard Supabase > SQL Editor.

alter table public.payments
  add column if not exists provider_reference text;

-- Unique, mais seulement quand elle est renseignée : une ligne dont
-- l'initialisation a échoué n'en a pas.
create unique index if not exists payments_provider_reference_key
  on public.payments (provider_reference)
  where provider_reference is not null;
