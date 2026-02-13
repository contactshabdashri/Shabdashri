import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  );
}

const fallbackUrl = supabaseUrl || 'https://invalid-project-ref.supabase.co';
const fallbackKey = supabaseAnonKey || 'invalid-anon-key';

export const supabase = createClient(fallbackUrl, fallbackKey);
