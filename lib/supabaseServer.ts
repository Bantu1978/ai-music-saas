import { createClient } from "@supabase/supabase-js";

// Utilisation de la variable privée SUPABASE_URL côté serveur
const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy_key";

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);