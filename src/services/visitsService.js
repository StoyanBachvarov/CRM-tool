import { supabase } from './supabaseClient';

export async function listVisits(customerId) {
  let query = supabase
    .from('visits')
    .select('id, customer_id, sales_rep_id, visit_date, description, notes, outcome, created_at, customers(name), profiles(full_name)')
    .order('visit_date', { ascending: false });

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data;
}

export async function upsertVisit(payload) {
  if (payload.id) {
    const { error } = await supabase.from('visits').update(payload).eq('id', payload.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('visits').insert(payload);
  if (error) {
    throw error;
  }
}

export async function deleteVisit(id) {
  const { error } = await supabase.from('visits').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
