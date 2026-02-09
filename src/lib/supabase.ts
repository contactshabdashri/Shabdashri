import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing');

let supabase;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
  } else {
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
} catch (error) {
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

/* 🔥 ADD THIS BLOCK 🔥 */
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

export { supabase };
