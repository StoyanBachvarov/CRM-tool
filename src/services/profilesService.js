import { supabase } from './supabaseClient';

export async function getProfileById(id) {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role, created_at').eq('id', id).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}
