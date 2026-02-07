import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug logging
console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Supabase Key:', supabaseAnonKey ? 'Set' : 'Missing');

// Create a fallback client or handle gracefully
let supabase: ReturnType<typeof createClient>;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
    console.log('Supabase client initialized successfully');
  } else {
    console.error('Missing Supabase environment variables. Please check your .env file.');
    console.error('URL:', supabaseUrl);
    console.error('Key:', supabaseAnonKey ? 'Present' : 'Missing');
    // Create a mock client that will show errors when used
    supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
  }
} catch (error) {
  console.error('Error initializing Supabase client:', error);
  // Create a fallback client
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
}

export { supabase };