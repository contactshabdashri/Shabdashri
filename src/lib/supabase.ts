import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://ojukbnabzpzlawlpzjcb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_U6fqmoRwnqFOQZ1ZgqINfw_oTB0DBGz';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'Using hardcoded Supabase fallback values. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel project settings.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
