import { listCustomers } from '../../services/customersService';
import { listSalesReps } from '../../services/salesRepsService';
import { deleteVisit, listVisits, upsertVisit } from '../../services/visitsService';

export async function renderVisitsPage(container, { showToast, user }) {
  const url = new URL(window.location.href);
  const selectedCustomerId = url.searchParams.get('customerId') || '';

  container.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="mb-0">Visits</h2>
      <button class="btn btn-primary" id="add-visit-btn"><i class="bi bi-plus-lg me-1"></i>Record Visit</button>
    </div>

    <div class="card shadow-sm mb-3 p-3">
      <div class="row g-3 align-items-end">
        <div class="col-md-5">
          <label class="form-label">Filter by Customer</label>
          <select class="form-select" id="customer-filter"></select>
        </div>
      </div>
    </div>

    <div class="card shadow-sm">
      <div class="table-responsive">
        <table class="table table-hover mb-0" id="visits-table">
          <thead class="table-light">
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Sales Rep</th>
              <th>Description</th>
              <th>Outcome</th>
              <th style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    </div>

    <div class="modal fade" id="visitModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <form id="visit-form">
            <div class="modal-header">
              <h5 class="modal-title">Visit</h5>
              <button class="btn-close" data-bs-dismiss="modal" type="button"></button>
            </div>
            <div class="modal-body row g-3">
              <input type="hidden" name="id" />
              <div class="col-md-6"><label class="form-label">Customer</label><select class="form-select" name="customer_id" required></select></div>
              <div class="col-md-6"><label class="form-label">Sales Rep</label><select class="form-select" name="sales_rep_id" required></select></div>
              <div class="col-md-6"><label class="form-label">Visit Date</label><input class="form-control" type="datetime-local" name="visit_date" required /></div>
              <div class="col-md-6"><label class="form-label">Outcome</label><input class="form-control" name="outcome" /></div>
              <div class="col-12"><label class="form-label">Description</label><input class="form-control" name="description" /></div>
              <div class="col-12"><label class="form-label">Notes</label><textarea class="form-control" name="notes" rows="3"></textarea></div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline-secondary" type="button" data-bs-dismiss="modal">Cancel</button>
              <button class="btn btn-primary" type="submit">Save</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#visits-table tbody');
  const customerFilter = document.getElementById('customer-filter');
  const form = document.getElementById('visit-form');
  const visitModal = new window.bootstrap.Modal(document.getElementById('visitModal'));

  let customers = [];
  let salesReps = [];
  let visits = [];

  async function initialize() {
    customers = await listCustomers();
    salesReps = await listSalesReps();

    customerFilter.innerHTML = [
      '<option value="">All Customers</option>',
      ...customers.map((c) => `<option value="${c.id}" ${c.id === selectedCustomerId ? 'selected' : ''}>${c.name}</option>`)
    ].join('');

    form.elements.customer_id.innerHTML = customers.map((c) => `<option value="${c.id}">${c.name}</option>`).join('');
    form.elements.sales_rep_id.innerHTML = salesReps.map((r) => `<option value="${r.id}">${r.full_name || r.id}</option>`).join('');
    form.elements.sales_rep_id.value = user.id;

    await loadVisits(customerFilter.value || selectedCustomerId || '');
  }

  async function loadVisits(customerId) {
    visits = await listVisits(customerId || undefined);
    tbody.innerHTML = visits
      .map(
        (visit) => `
          <tr>
            <td>${new Date(visit.visit_date).toLocaleString()}</td>
            <td>${visit.customers?.name || '-'}</td>
            <td>${visit.profiles?.full_name || '-'}</td>
            <td>${visit.description || '-'}</td>
            <td>${visit.outcome || '-'}</td>
            <td>
              <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${visit.id}">Edit</button>
              <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${visit.id}">Delete</button>
            </td>
          </tr>
        `
      )
      .join('');

    bindRowActions();
  }

  function bindRowActions() {
    tbody.querySelectorAll('.edit-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const visit = visits.find((v) => v.id === button.dataset.id);
        fillForm(visit);
        visitModal.show();
      });
    });

    tbody.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this visit?')) return;

        try {
          await deleteVisit(button.dataset.id);
          showToast('Visit deleted');
          await loadVisits(customerFilter.value);
        } catch (error) {
          showToast(error.message, 'danger');
        }
      });
    });
  }

  function fillForm(visit) {
    form.reset();
    form.elements.id.value = visit.id;
    form.elements.customer_id.value = visit.customer_id;
    form.elements.sales_rep_id.value = visit.sales_rep_id;
    form.elements.visit_date.value = toDatetimeLocal(visit.visit_date);
    form.elements.description.value = visit.description || '';
    form.elements.notes.value = visit.notes || '';
    form.elements.outcome.value = visit.outcome || '';
  }

  customerFilter.addEventListener('change', async () => {
    await loadVisits(customerFilter.value || undefined);
  });

  document.getElementById('add-visit-btn').addEventListener('click', () => {
    form.reset();
    form.elements.id.value = '';
    if (customerFilter.value) {
      form.elements.customer_id.value = customerFilter.value;
    }
    form.elements.sales_rep_id.value = user.id;
    visitModal.show();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());

    if (!payload.id) {
      delete payload.id;
    }

    payload.visit_date = new Date(payload.visit_date).toISOString();

    try {
      await upsertVisit(payload);
      visitModal.hide();
      showToast(payload.id ? 'Visit updated' : 'Visit recorded');
      await loadVisits(customerFilter.value || undefined);
    } catch (error) {
      showToast(error.message, 'danger');
    }
  });

  try {
    await initialize();
  } catch (error) {
    showToast(error.message, 'danger');
  }
}

function toDatetimeLocal(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60000);
  return adjusted.toISOString().slice(0, 16);
}
