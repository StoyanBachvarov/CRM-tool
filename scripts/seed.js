import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const usersToCreate = [
  { email: 'steve@gmail.com', password: 'pass123', full_name: 'Steve Morrow' },
  { email: 'maria@gmail.com', password: 'pass123', full_name: 'Maria Vance' },
  { email: 'peter@gmail.com', password: 'pass123', full_name: 'Peter Cole' }
];

async function upsertAuthUsers() {
  const ids = [];

  for (const candidate of usersToCreate) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existing = existingUsers.users.find((item) => item.email === candidate.email);

    if (existing) {
      ids.push(existing.id);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
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

    ids.push(data.user.id);
  }

  return ids;
}

async function seedData(userIds) {
  const customers = [
    { name: 'Acme Corp', company: 'Acme Corp', address: 'London', unique_number: 'C-1001', owner_id: userIds[0] },
    { name: 'Nimbus Labs', company: 'Nimbus Labs', address: 'Berlin', unique_number: 'C-1002', owner_id: userIds[1] },
    { name: 'Bluewave Trade', company: 'Bluewave', address: 'Madrid', unique_number: 'C-1003', owner_id: userIds[2] },
    { name: 'Vertex Systems', company: 'Vertex', address: 'Paris', unique_number: 'C-1004', owner_id: userIds[0] }
  ];

  const { data: insertedCustomers, error: customerError } = await supabase
    .from('customers')
    .upsert(customers, { onConflict: 'owner_id,unique_number' })
    .select('id, owner_id, name');

  if (customerError) throw customerError;

  for (const customer of insertedCustomers) {
    const { data: project, error: projectError } = await supabase
      .from('customer_projects')
      .insert({
        customer_id: customer.id,
        owner_id: customer.owner_id,
        title: `${customer.name} Core Project`,
        description: `Main implementation stream for ${customer.name}`
      })
      .select('id')
      .single();

    if (projectError) throw projectError;

    const { data: stages, error: stagesError } = await supabase
      .from('project_stages')
      .insert([
        { project_id: project.id, name: 'New', position: 1 },
        { project_id: project.id, name: 'In Progress', position: 2 },
        { project_id: project.id, name: 'Completed', position: 3 }
      ])
      .select('id, name');

    if (stagesError) throw stagesError;

    const stageByName = Object.fromEntries(stages.map((s) => [s.name, s.id]));

    const taskRows = Array.from({ length: 10 }, (_, index) => {
      const stageName = index < 3 ? 'New' : index < 7 ? 'In Progress' : 'Completed';
      return {
        project_id: project.id,
        stage_id: stageByName[stageName],
        title: `Task ${index + 1} for ${customer.name}`,
        description: `Action item ${index + 1} for ${customer.name}`,
        assigned_sales_rep_id: userIds[index % userIds.length],
        status: stageName === 'Completed' ? 'completed' : stageName === 'In Progress' ? 'in_progress' : 'open',
        position: index + 1
      };
    });

    const { error: tasksError } = await supabase.from('tasks').insert(taskRows);
    if (tasksError) throw tasksError;

    const visits = [
      {
        customer_id: customer.id,
        sales_rep_id: customer.owner_id,
        visit_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        description: `Kickoff call with ${customer.name}`,
        notes: 'Customer requested a milestone plan',
        outcome: 'Follow-up scheduled'
      },
      {
        customer_id: customer.id,
        sales_rep_id: customer.owner_id,
        visit_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        description: `Demo session for ${customer.name}`,
        notes: 'Review first sprint deliverables',
        outcome: 'Pending'
      }
    ];

    const { error: visitsError } = await supabase.from('visits').insert(visits);
    if (visitsError) throw visitsError;
  }
}

(async () => {
  try {
    if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.');
    }

    const ids = await upsertAuthUsers();
    await seedData(ids);
    console.log('Seed complete');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
