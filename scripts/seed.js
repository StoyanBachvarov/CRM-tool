import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

loadEnvFromFile();

let supabase;

const usersToCreate = [
  { email: 'stoyan@gmail.com', password: 'pass123', full_name: 'Stoyan Ivanov' },
  { email: 'ani@gmail.com', password: 'pass123', full_name: 'Ani Petrova' },
  { email: 'stefi@gmail.com', password: 'pass123', full_name: 'Stefi Georgieva' },
  { email: 'kati@gmail.com', password: 'pass123', full_name: 'Kati Dimitrova' }
];

const seededCustomers = [
  { name: 'Acme Retail', address: 'Sofia, Bulgaria', customerId: 'CUST-1001', uniqueNumber: 'C-1001', ownerEmail: 'stoyan@gmail.com' },
  { name: 'Nimbus Hotels', address: 'Plovdiv, Bulgaria', customerId: 'CUST-1002', uniqueNumber: 'C-1002', ownerEmail: 'ani@gmail.com' },
  { name: 'Bluewave Logistics', address: 'Varna, Bulgaria', customerId: 'CUST-1003', uniqueNumber: 'C-1003', ownerEmail: 'stefi@gmail.com' },
  { name: 'Vertex Manufacturing', address: 'Burgas, Bulgaria', customerId: 'CUST-1004', uniqueNumber: 'C-1004', ownerEmail: 'kati@gmail.com' }
];

const stageTemplate = [
  { name: 'New', position: 1 },
  { name: 'In Progress', position: 2 },
  { name: 'Completed', position: 3 }
];

const taskPlanByProject = [11, 10, 12, 11];

function loadEnvFromFile() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function getSupabaseClient() {
  if (supabase) {
    return supabase;
  }

  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.');
  }

  supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  return supabase;
}

async function listAllAuthUsers() {
  const client = getSupabaseClient();
  const users = [];
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const chunk = data?.users || [];
    users.push(...chunk);

    if (chunk.length < perPage) {
      break;
    }

    page += 1;
  }

  return users;
}

async function upsertAuthUsers() {
  const client = getSupabaseClient();
  const usersByEmail = new Map();
  const existingUsers = await listAllAuthUsers();

  existingUsers.forEach((user) => {
    if (user.email) {
      usersByEmail.set(user.email.toLowerCase(), user);
    }
  });

  for (const candidate of usersToCreate) {
    const normalizedEmail = candidate.email.toLowerCase();
    const existing = usersByEmail.get(normalizedEmail);

    if (existing) {
      continue;
    }

    const { data, error } = await client.auth.admin.createUser({
      email: candidate.email,
      password: candidate.password,
      email_confirm: true,
      user_metadata: {
        full_name: candidate.full_name
      }
    });

    if (error) {
      throw error;
    }

    usersByEmail.set(normalizedEmail, data.user);
  }

  const result = [];
  for (const candidate of usersToCreate) {
    const user = usersByEmail.get(candidate.email.toLowerCase());
    if (!user) {
      throw new Error(`Unable to resolve auth user for ${candidate.email}`);
    }
    result.push({
      id: user.id,
      email: candidate.email.toLowerCase(),
      fullName: candidate.full_name
    });
  }

  return result;
}

async function ensureProfiles(users) {
  const client = getSupabaseClient();
  const profileRows = users.map((user) => ({
    id: user.id,
    full_name: user.fullName,
    role: 'sales_rep'
  }));

  const { error } = await client
    .from('profiles')
    .upsert(profileRows, { onConflict: 'id' });

  if (error) {
    throw error;
  }
}

async function upsertCustomers(usersByEmail) {
  const client = getSupabaseClient();
  const customerRows = seededCustomers.map((customer) => {
    const ownerId = usersByEmail.get(customer.ownerEmail)?.id;
    if (!ownerId) {
      throw new Error(`Missing owner for customer ${customer.name}`);
    }

    return {
      name: customer.name,
      address: customer.address,
      customer_id: customer.customerId,
      unique_number: customer.uniqueNumber,
      owner_id: ownerId
    };
  });

  const { data, error } = await client
    .from('customers')
    .upsert(customerRows, { onConflict: 'owner_id,customer_id' })
    .select('id, owner_id, name, customer_id');

  if (error) {
    throw error;
  }

  return data || [];
}

async function upsertProjectForCustomer(customer) {
  const client = getSupabaseClient();
  const title = `[Seed] ${customer.name} Core Project`;

  const { data: existing, error: lookupError } = await client
    .from('customer_projects')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('title', title)
    .maybeSingle();

  if (lookupError) {
    throw lookupError;
  }

  if (existing) {
    return existing.id;
  }

  const { data, error } = await client
    .from('customer_projects')
    .insert({
      customer_id: customer.id,
      owner_id: customer.owner_id,
      title,
      description: `Seed project for ${customer.name}`
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function upsertDefaultStages(projectId) {
  const client = getSupabaseClient();
  const stageRows = stageTemplate.map((stage) => ({
    project_id: projectId,
    name: stage.name,
    position: stage.position
  }));

  const { error } = await client
    .from('project_stages')
    .upsert(stageRows, { onConflict: 'project_id,position' });

  if (error) {
    throw error;
  }

  const { data, error: selectError } = await client
    .from('project_stages')
    .select('id, name, position')
    .eq('project_id', projectId)
    .order('position', { ascending: true });

  if (selectError) {
    throw selectError;
  }

  return data || [];
}

function createTaskRows(projectId, stagesByName, taskCount, projectName, userIds) {
  return Array.from({ length: taskCount }, (_, index) => {
    let stageName = 'New';

    if (index >= Math.ceil(taskCount * 0.7)) {
      stageName = 'Completed';
    } else if (index >= Math.ceil(taskCount * 0.35)) {
      stageName = 'In Progress';
    }

    const status = stageName === 'Completed' ? 'completed' : stageName === 'In Progress' ? 'in_progress' : 'open';

    return {
      project_id: projectId,
      stage_id: stagesByName.get(stageName),
      title: `[Seed] ${projectName} Task ${index + 1}`,
      description: `Seed task ${index + 1} for ${projectName}`,
      assigned_sales_rep_id: userIds[index % userIds.length],
      status,
      position: index + 1
    };
  });
}

async function reseedTasksForProject(projectId, taskRows) {
  const client = getSupabaseClient();

  const { error: deleteError } = await client
    .from('tasks')
    .delete()
    .eq('project_id', projectId)
    .like('title', '[Seed]%');

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await client
    .from('tasks')
    .insert(taskRows);

  if (insertError) {
    throw insertError;
  }
}

function createVisitRows(customerId, ownerId, customerName, customerIndex) {
  const baseDate = new Date();
  const visitCount = customerIndex % 2 === 0 ? 2 : 3;

  const visitTemplates = [
    {
      dayOffset: 2,
      notes: 'Initial discovery call completed. Pain points and target timeline captured.',
      outcome: 'Qualified lead. Prepare proposal.'
    },
    {
      dayOffset: 9,
      notes: 'Solution walkthrough performed with stakeholder team.',
      outcome: 'Positive feedback. Pilot scope approved.'
    },
    {
      dayOffset: 16,
      notes: 'Commercial terms reviewed with procurement contact.',
      outcome: 'Contract review started.'
    }
  ];

  return visitTemplates.slice(0, visitCount).map((template, index) => {
    const visitDate = new Date(baseDate);
    visitDate.setDate(baseDate.getDate() + template.dayOffset + customerIndex);

    return {
      customer_id: customerId,
      sales_rep_id: ownerId,
      visit_date: visitDate.toISOString(),
      description: `[Seed] Visit ${index + 1} with ${customerName}`,
      notes: template.notes,
      outcome: template.outcome
    };
  });
}

async function reseedVisitsForCustomer(customerId, visitRows) {
  const client = getSupabaseClient();

  const { error: deleteError } = await client
    .from('visits')
    .delete()
    .eq('customer_id', customerId)
    .like('description', '[Seed]%');

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await client
    .from('visits')
    .insert(visitRows);

  if (insertError) {
    throw insertError;
  }
}

async function seedData(users) {
  const usersByEmail = new Map(users.map((user) => [user.email, user]));
  const userIds = users.map((user) => user.id);

  await ensureProfiles(users);
  const customers = await upsertCustomers(usersByEmail);

  for (let index = 0; index < customers.length; index += 1) {
    const customer = customers[index];
    const taskCount = taskPlanByProject[index % taskPlanByProject.length];

    const projectId = await upsertProjectForCustomer(customer);
    const stages = await upsertDefaultStages(projectId);
    const stagesByName = new Map(stages.map((stage) => [stage.name, stage.id]));

    const taskRows = createTaskRows(projectId, stagesByName, taskCount, customer.name, userIds);
    await reseedTasksForProject(projectId, taskRows);

    const visitRows = createVisitRows(customer.id, customer.owner_id, customer.name, index);
    await reseedVisitsForCustomer(customer.id, visitRows);
  }
}

async function runSeed() {
  getSupabaseClient();

  const users = await upsertAuthUsers();
  await seedData(users);

  console.log('Seed complete');
  console.log('Users:');
  usersToCreate.forEach((user) => {
    console.log(`- ${user.email} / ${user.password}`);
  });
}
    const ids = await upsertAuthUsers();
    await seedData(ids);
    console.log('Seed complete');
    await runSeed();
