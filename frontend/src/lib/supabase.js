import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error(
    "Falta VITE_SUPABASE_URL. Copia .env.example a .env y completa las variables."
  );
}
if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Falta VITE_SUPABASE_ANON_KEY. Copia .env.example a .env y completa las variables."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true },
});
