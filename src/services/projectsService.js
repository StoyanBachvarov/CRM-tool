import { supabase } from './supabaseClient';

export async function listProjects(customerId) {
  let query = supabase
    .from('customer_projects')
    .select('id, customer_id, title, description, owner_id, created_at, customers(name)')
    .order('created_at', { ascending: false });

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return data;
}

export async function upsertProject(payload) {
  if (payload.id) {
    const { error } = await supabase.from('customer_projects').update(payload).eq('id', payload.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { data, error } = await supabase.from('customer_projects').insert(payload).select('id').single();
  if (error) {
    throw error;
  }

  await createDefaultStages(data.id);
}

export async function deleteProject(id) {
  const { error } = await supabase.from('customer_projects').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

async function createDefaultStages(projectId) {
  const defaults = [
    { project_id: projectId, name: 'New', position: 1 },
    { project_id: projectId, name: 'In Progress', position: 2 },
    { project_id: projectId, name: 'Completed', position: 3 }
  ];

  const { error } = await supabase.from('project_stages').insert(defaults);
  if (error) {
    throw error;
  }
}

export async function getProjectTaskStats(projectIds) {
  if (!projectIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('tasks')
    .select('id, project_id, status')
    .in('project_id', projectIds);

  if (error) {
    throw error;
  }

  const stats = new Map();

  data.forEach((task) => {
    if (!stats.has(task.project_id)) {
      stats.set(task.project_id, { open: 0, completed: 0 });
    }
    const value = stats.get(task.project_id);
    if (task.status === 'completed') {
      value.completed += 1;
    } else {
      value.open += 1;
    }
  });

  return stats;
}

export async function getStageCountByProject(projectIds) {
  if (!projectIds.length) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('project_stages')
    .select('id, project_id')
    .in('project_id', projectIds);

  if (error) {
    throw error;
  }

  const counts = new Map();
  data.forEach((stage) => {
    counts.set(stage.project_id, (counts.get(stage.project_id) || 0) + 1);
  });

  return counts;
}
