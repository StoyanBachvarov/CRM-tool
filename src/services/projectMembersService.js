import { supabase } from './supabaseClient';

export async function listProjectMembers(projectId) {
  const { data, error } = await supabase
    .from('project_members')
    .select('project_id, user_id, created_at, profiles!project_members_user_id_fkey(id, full_name, role)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listAllUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .order('full_name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function addProjectMember(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .insert({ project_id: projectId, user_id: userId });

  if (error) {
    throw error;
  }
}

export async function removeProjectMember(projectId, userId) {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
