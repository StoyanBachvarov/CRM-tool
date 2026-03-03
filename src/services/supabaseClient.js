import { createClient } from '@supabase/supabase-js';

const hasViteSupabaseUrl = Boolean(import.meta.env.VITE_SUPABASE_URL);
const hasViteSupabaseAnonKey = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
const hasFallbackSupabaseUrl = Boolean(__CRM_SUPABASE_URL__);
const hasFallbackSupabaseAnonKey = Boolean(__CRM_SUPABASE_ANON_KEY__);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || __CRM_SUPABASE_URL__;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || __CRM_SUPABASE_ANON_KEY__;

export const supabaseConfigSource = hasViteSupabaseUrl && hasViteSupabaseAnonKey ? 'vite' : hasFallbackSupabaseUrl && hasFallbackSupabaseAnonKey ? 'fallback' : 'missing';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables are missing. Create .env from .env.example');
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  }
  return supabase;
}
