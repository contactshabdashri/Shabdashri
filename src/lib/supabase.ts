import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const missingSupabaseMessage =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local .env or deployment settings, then restart/redeploy.';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(missingSupabaseMessage);
}

function createMissingSupabaseClient() {
  const throwMissingConfigError = () => {
    throw new Error(missingSupabaseMessage);
  };

  return new Proxy(
    {},
    {
      get() {
        return throwMissingConfigError;
      },
    }
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (createMissingSupabaseClient() as ReturnType<typeof createClient>);
