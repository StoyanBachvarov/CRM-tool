import { supabase } from './supabaseClient';

async function getAuthenticatedUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  if (!data?.user?.id) {
    throw new Error('Your session has expired. Please log in again.');
  }

  return data.user.id;
}

function normalizeProjectPayload(payload) {
  const normalizedPayload = { ...payload };

  normalizedPayload.customer_id = String(normalizedPayload.customer_id || '').trim();
  normalizedPayload.title = String(normalizedPayload.title || '').trim();
  normalizedPayload.description = String(normalizedPayload.description || '').trim();

  if (!normalizedPayload.customer_id) {
    throw new Error('Please select a customer.');
  }

  if (!normalizedPayload.title) {
    throw new Error('Project title is required.');
  }

  return normalizedPayload;
}

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

export async function listProjectsPaged({ customerId, page = 1, pageSize = 20 } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 20);
  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = supabase
    .from('customer_projects')
    .select('id, customer_id, title, description, owner_id, created_at, customers(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (customerId) {
    query = query.eq('customer_id', customerId);
  }

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  return {
    items: data || [],
    total: count || 0,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / safePageSize))
  };
}

export async function upsertProject(payload) {
  const normalizedPayload = normalizeProjectPayload(payload);

  if (payload.id) {
    const updatePayload = { ...normalizedPayload };
    delete updatePayload.id;
    delete updatePayload.owner_id;

    const { error } = await supabase.from('customer_projects').update(updatePayload).eq('id', payload.id);
    if (error) {
      throw error;
    }
    return;
  }

  await getAuthenticatedUserId();
  const { data, error } = await supabase.rpc('create_customer_project', {
    p_customer_id: normalizedPayload.customer_id,
    p_title: normalizedPayload.title,
    p_description: normalizedPayload.description || null
  });

  if (error) {
    const message = error.message?.toLowerCase() || '';
    if (message.includes('not allowed to create project for this customer')) {
      throw new Error('Project creation is blocked by permissions. Make sure the selected customer belongs to your account and try again.');
    }
    if (message.includes('not authenticated')) {
      throw new Error('Your session has expired. Please log in again.');
    }
    throw error;
  }

  await createDefaultStages(data);
}

export async function getProjectById(projectId) {
  const { data, error } = await supabase
    .from('customer_projects')
    .select('id, customer_id, title, description, owner_id, created_at, customers(name)')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
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
