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
    .select('id, project_id, stage_id, title, description, assigned_sales_rep_id, status, due_date, position, created_at, profiles(full_name), task_label_assignments(label_id, task_labels(id, name, color))')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertTask(payload) {
  const normalizedPayload = {
    ...payload,
    due_date: payload.due_date || null
  };

  if (payload.id) {
    const { error } = await supabase.from('tasks').update(normalizedPayload).eq('id', payload.id);
    if (error) {
      throw error;
    }
    return payload.id;
  }

  const { data, error } = await supabase.from('tasks').insert(normalizedPayload).select('id').single();
  if (error) {
    throw error;
  }

  return data.id;
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

export async function listTaskComments(taskId) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('id, task_id, author_id, message, created_at, profiles(full_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function addTaskComment(taskId, authorId, message) {
  const { error } = await supabase.from('task_comments').insert({
    task_id: taskId,
    author_id: authorId,
    message
  });

  if (error) {
    throw error;
  }
}

export async function listTaskLabels() {
  const { data, error } = await supabase
    .from('task_labels')
    .select('id, name, color')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listLabelsForTask(taskId) {
  const { data, error } = await supabase
    .from('task_label_assignments')
    .select('label_id')
    .eq('task_id', taskId);

  if (error) {
    throw error;
  }

  return data.map((row) => row.label_id);
}

export async function replaceTaskLabels(taskId, labelIds) {
  const { error: deleteError } = await supabase
    .from('task_label_assignments')
    .delete()
    .eq('task_id', taskId);

  if (deleteError) {
    throw deleteError;
  }

  if (!labelIds.length) {
    return;
  }

  const rows = labelIds.map((labelId) => ({
    task_id: taskId,
    label_id: labelId
  }));

  const { error: insertError } = await supabase.from('task_label_assignments').insert(rows);
  if (insertError) {
    throw insertError;
  }
}

export async function listTasksByLabel(labelId) {
  const { data, error } = labelId
    ? await supabase
        .from('tasks')
      .select('id, title, description, status, due_date, project_id, stage_id, assigned_sales_rep_id, created_at, customer_projects(title), project_stages(name), profiles(full_name), task_label_assignments!inner(label_id, task_labels(id, name, color))')
        .eq('task_label_assignments.label_id', labelId)
        .order('created_at', { ascending: false })
    : await supabase
        .from('tasks')
      .select('id, title, description, status, due_date, project_id, stage_id, assigned_sales_rep_id, created_at, customer_projects(title), project_stages(name), profiles(full_name), task_label_assignments(label_id, task_labels(id, name, color))')
        .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listTasksByDeadline() {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, title, description, status, due_date, project_id, stage_id, assigned_sales_rep_id, created_at, customer_projects(title), project_stages(name), profiles(full_name), task_label_assignments(label_id, task_labels(id, name, color))')
    .not('due_date', 'is', null)
    .order('due_date', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function listTaskChecklist(taskId) {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .select('id, task_id, content, position, is_done, created_at, updated_at')
    .eq('task_id', taskId)
    .order('position', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

export async function addTaskChecklistItem(taskId, content, position) {
  const { error } = await supabase.from('task_checklist_items').insert({
    task_id: taskId,
    content,
    position,
    is_done: false
  });

  if (error) {
    throw error;
  }
}

export async function updateTaskChecklistItem(itemId, payload) {
  const { error } = await supabase
    .from('task_checklist_items')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', itemId);

  if (error) {
    throw error;
  }
}

export async function deleteTaskChecklistItem(itemId) {
  const { error } = await supabase.from('task_checklist_items').delete().eq('id', itemId);

  if (error) {
    throw error;
  }
}

export async function listTaskActivity(taskId) {
  const { data, error } = await supabase
    .from('task_activity_logs')
    .select('id, task_id, project_id, actor_id, action_type, message, details, created_at, profiles(full_name)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}
