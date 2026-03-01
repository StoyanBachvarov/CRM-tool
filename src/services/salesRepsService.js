import { supabase } from './supabaseClient';

export async function listSalesReps() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateSalesRepRole(id, role) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
  if (error) {
    throw error;
  }
}

export async function updateSalesRepName(id, full_name) {
  const { error } = await supabase.from('profiles').update({ full_name }).eq('id', id);
  if (error) {
    throw error;
  }
}
