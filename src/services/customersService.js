import { supabase } from './supabaseClient';

function normalizeCustomerPayload(payload) {
  const normalizedPayload = { ...payload };

  const uniqueNumber = normalizedPayload.unique_number?.trim?.();
  const customerIdentifier = normalizedPayload.customer_id?.trim?.();

  if (uniqueNumber) {
    normalizedPayload.unique_number = uniqueNumber;
    normalizedPayload.customer_id = uniqueNumber;
  } else if (customerIdentifier) {
    normalizedPayload.customer_id = customerIdentifier;
  }

  return normalizedPayload;
}

export async function listCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, address, unique_number, company, contact_email, contact_phone, notes, owner_id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertCustomer(payload) {
  const normalizedPayload = normalizeCustomerPayload(payload);

  if (payload.id) {
    const { error } = await supabase.from('customers').update(normalizedPayload).eq('id', payload.id);
    if (error) {
      throw error;
    }
    return;
  }

  const { error } = await supabase.from('customers').insert(normalizedPayload);
  if (error) {
    throw error;
  }
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) {
    throw error;
  }
}

export async function getCustomerStats() {
  const [customersResult, projectsResult, visitsResult] = await Promise.all([
    supabase.from('customers').select('id'),
    supabase.from('customer_projects').select('id, customer_id'),
    supabase.from('visits').select('id, customer_id, visit_date')
  ]);

  if (customersResult.error) throw customersResult.error;
  if (projectsResult.error) throw projectsResult.error;
  if (visitsResult.error) throw visitsResult.error;

  const projectsByCustomer = new Map();
  projectsResult.data.forEach((project) => {
    projectsByCustomer.set(project.customer_id, (projectsByCustomer.get(project.customer_id) || 0) + 1);
  });

  const now = new Date();
  const visitsByCustomer = new Map();
  visitsResult.data.forEach((visit) => {
    if (new Date(visit.visit_date) >= now) {
      visitsByCustomer.set(visit.customer_id, (visitsByCustomer.get(visit.customer_id) || 0) + 1);
    }
  });

  return customersResult.data.map((customer) => ({
    customerId: customer.id,
    projectsCount: projectsByCustomer.get(customer.id) || 0,
    upcomingVisits: visitsByCustomer.get(customer.id) || 0
  }));
}
