import { supabase } from './supabaseClient';

export async function listProjectStages(projectId) {
  const { data, error } = await supabase
    .from('project_stages')
    .select('id, project_id, name, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listTasksByProject(projectId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, project_id, stage_id, title, description, assigned_sales_rep_id, status, position, created_at, profiles(full_name)')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertTask(payload) {
  if (payload.id) {
    const { error } = await supabase.from('tasks').update(payload).eq('id', payload.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('tasks').insert(payload);
  if (error) {
    throw error;
  }
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function moveTask(id, stageId, position, status) {
  const { error } = await supabase
    .from('tasks')
    .update({ stage_id: stageId, position, status })
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function getDashboardCounts() {
  const [customersResult, projectsResult, tasksResult, visitsResult] = await Promise.all([
    supabase.from('customers').select('id'),
    supabase.from('customer_projects').select('id'),
    supabase.from('tasks').select('id, status'),
    supabase.from('visits').select('id, visit_date')
  ]);

  if (customersResult.error) throw customersResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (visitsResult.error) throw visitsResult.error;

  const now = new Date();
  let completedTasks = 0;
  let openTasks = 0;
  let upcomingVisits = 0;

  tasksResult.data.forEach((task) => {
    if (task.status === 'completed') {
      completedTasks += 1;
    } else {
      openTasks += 1;
    }
  });

  visitsResult.data.forEach((visit) => {
    if (new Date(visit.visit_date) >= now) {
      upcomingVisits += 1;
    }
  });

  return {
    customers: customersResult.data.length,
    projects: projectsResult.data.length,
    openTasks,
    completedTasks,
    upcomingVisits
  };
}
