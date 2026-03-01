import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnvFromFile();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
}

const TARGET_PROJECTS = Number(process.env.SCALE_PROJECTS || 120);
const TASKS_PER_PROJECT = Number(process.env.SCALE_TASKS_PER_PROJECT || 110);

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

function loadEnvFromFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const rows = readFileSync(envPath, 'utf8').split(/\r?\n/);
  rows.forEach((row) => {
    const line = row.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) {
      return;
    }

    const separatorIndex = line.indexOf('=');
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function buildTaskRows(projectId, stagesByName, ownerId, projectTitle) {
  const rows = [];
  for (let index = 0; index < TASKS_PER_PROJECT; index += 1) {
    let stageName = 'New';
    if (index >= Math.ceil(TASKS_PER_PROJECT * 0.7)) {
      stageName = 'Completed';
    } else if (index >= Math.ceil(TASKS_PER_PROJECT * 0.35)) {
      stageName = 'In Progress';
    }

    const status = stageName === 'Completed' ? 'completed' : stageName === 'In Progress' ? 'in_progress' : 'open';

    rows.push({
      project_id: projectId,
      stage_id: stagesByName.get(stageName),
      title: `[Scale] ${projectTitle} Task ${index + 1}`,
      description: `Generated scale task ${index + 1}`,
      assigned_sales_rep_id: ownerId,
      status,
      position: index + 1
    });
  }

  return rows;
}

async function ensureProjectStages(projectId) {
  const defaultStages = [
    { project_id: projectId, name: 'New', position: 1 },
    { project_id: projectId, name: 'In Progress', position: 2 },
    { project_id: projectId, name: 'Completed', position: 3 }
  ];

  const { error: upsertError } = await client.from('project_stages').upsert(defaultStages, { onConflict: 'project_id,position' });
  if (upsertError) {
    throw upsertError;
  }

  const { data: stages, error: stageError } = await client
    .from('project_stages')
    .select('id, name')
    .eq('project_id', projectId);

  if (stageError) {
    throw stageError;
  }

  return new Map((stages || []).map((stage) => [stage.name, stage.id]));
}

async function run() {
  const { data: customers, error: customersError } = await client.from('customers').select('id, owner_id, name').order('created_at', { ascending: true });
  if (customersError) {
    throw customersError;
  }

  if (!customers?.length) {
    throw new Error('No customers found. Seed customers first.');
  }

  const { data: existingProjects, error: projectsError } = await client
    .from('customer_projects')
    .select('id, title, owner_id, customer_id')
    .like('title', '[Scale]%');

  if (projectsError) {
    throw projectsError;
  }

  const projects = existingProjects || [];
  let createdProjects = 0;
  for (let index = projects.length; index < TARGET_PROJECTS; index += 1) {
    const customer = customers[index % customers.length];
    const title = `[Scale] ${customer.name} Project ${index + 1}`;

    const { data: inserted, error: insertError } = await client
      .from('customer_projects')
      .insert({
        customer_id: customer.id,
        owner_id: customer.owner_id,
        title,
        description: `Generated scale project ${index + 1}`
      })
      .select('id, title, owner_id, customer_id')
      .single();

    if (insertError) {
      throw insertError;
    }

    projects.push(inserted);
    createdProjects += 1;
  }

  for (const project of projects) {
    const stagesByName = await ensureProjectStages(project.id);

    const { data: existingTasks, error: existingTasksError } = await client
      .from('tasks')
      .select('id')
      .eq('project_id', project.id)
      .like('title', '[Scale]%');

    if (existingTasksError) {
      throw existingTasksError;
    }

    const existingCount = existingTasks?.length || 0;
    if (existingCount >= TASKS_PER_PROJECT) {
      continue;
    }

    const missingCount = TASKS_PER_PROJECT - existingCount;
    const rows = buildTaskRows(project.id, stagesByName, project.owner_id, project.title).slice(existingCount, existingCount + missingCount);

    const { error: taskInsertError } = await client.from('tasks').insert(rows);
    if (taskInsertError) {
      throw taskInsertError;
    }
  }

  console.log(`Scale complete. Projects target: ${TARGET_PROJECTS}, Tasks per project target: ${TASKS_PER_PROJECT}`);
  console.log(`Created new scale projects: ${createdProjects}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
