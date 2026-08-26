/**
 * Crédits offerts à la création d'un compte.
 *
 * Source unique : la valeur alimente à la fois l'insertion du profil et les
 * textes qui l'annoncent, via une interpolation ICU. Auparavant le nombre était
 * écrit en toutes lettres dans six messages — changer l'offre demandait de les
 * retrouver tous, et un oubli faisait mentir la page d'accueil.
 *
 * À garder aligné avec le défaut de la colonne `profiles.credits`
 * (voir supabase/migrations/0004_profiles_credits_default.sql).
 */
export const SIGNUP_CREDITS = 2;
