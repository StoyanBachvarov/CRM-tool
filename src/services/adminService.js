import { supabase } from './supabaseClient';

export async function listAdminCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, company, unique_number, contact_email, contact_phone, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAdminCustomer(id, payload) {
  const { error } = await supabase.from('customers').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

export async function listAdminProjects() {
  const { data, error } = await supabase
    .from('customer_projects')
    .select('id, customer_id, owner_id, title, description, created_at, customers(name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAdminProject(id, payload) {
  const { error } = await supabase.from('customer_projects').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminProject(id) {
  const { error } = await supabase.from('customer_projects').delete().eq('id', id);
  if (error) throw error;
}

export async function listAdminProjectStages(projectId) {
  let query = supabase
    .from('project_stages')
    .select('id, project_id, name, position, created_at')
    .order('position', { ascending: true });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateAdminProjectStage(id, payload) {
  const { error } = await supabase.from('project_stages').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminProjectStage(id) {
  const { error } = await supabase.from('project_stages').delete().eq('id', id);
  if (error) throw error;
}

export async function listAdminTasks(projectId) {
  let query = supabase
    .from('tasks')
    .select('id, project_id, stage_id, title, description, assigned_sales_rep_id, status, position, created_at, customer_projects(title), project_stages(name), profiles(full_name)')
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateAdminTask(id, payload) {
  const { error } = await supabase.from('tasks').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function listAdminUsers() {
  const { data, error } = await supabase.from('profiles').select('id, full_name, role, created_at').order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function updateAdminUser(id, payload) {
  const { error } = await supabase.from('profiles').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminUser(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}
